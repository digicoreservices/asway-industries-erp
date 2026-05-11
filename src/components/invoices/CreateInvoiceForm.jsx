import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Plus, Trash2, Save, Edit, FileDown, Search, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { numberToWords } from '@/lib/numberToWords';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import useClientManagement from '@/hooks/useClientManagement';
import AddClientForm from '@/components/clients/AddClientForm';
import EditClientForm from '@/components/clients/EditClientForm';
import { fetchWithRetry, cn } from '@/lib/utils';
import { getCachedCustomers, getProductsPaginated, getOptimizedPOItems, getOptimizedPOSchedules } from '@/lib/optimizedQueries';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const COMPANY_OPTIONS = [
  {
    id: 'asway_ind',
    name: 'Asway Industries Pvt. Ltd.',
    address: 'G.No. 50, Plot No, 10, Flat No. 3, Abhimanyu Appartment',
    district: 'Baramati',
    state: 'Maharashtra',
    gstin: '27AARCA0262A1Z1',
    code: '27'
  },
  {
    id: 'yogiraj_presstech',
    name: 'Yogiraj Presstech',
    address: 'C-67, MIDC',
    district: 'Baramati - 413133',
    state: 'Maharashtra',
    gstin: '27AEBPV5187N1Z0',
    code: '27'
  }
];

const CreateInvoiceForm = ({ onClose, onSuccess, invoiceData }) => {
  const { toast } = useToast();
  // We use local client state with getCachedCustomers to avoid unneeded large fetches
  const [clients, setClients] = useState([]);
  const [clientsError, setClientsError] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState(null);
  const [isViewMode, setIsViewMode] = useState(!!invoiceData); 
  const isMounted = useRef(true);
  
  const [customerPOs, setCustomerPOs] = useState([]);
  const [products, setProducts] = useState([]); 
  const [poItems, setPoItems] = useState([]); 
  const [poSchedules, setPoSchedules] = useState({}); 

  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);

  const [buyerSearchTerm, setBuyerSearchTerm] = useState('');
  const [showBuyerSuggestions, setShowBuyerSuggestions] = useState(false);
  const [consigneeSearchTerm, setConsigneeSearchTerm] = useState('');
  const [showConsigneeSuggestions, setShowConsigneeSuggestions] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState(COMPANY_OPTIONS[0]);
  const [formData, setFormData] = useState({
    invoiceNumber: '', 
    invoiceDate: '', 
    referenceNo: '',
    referenceDate: '',
    dispatchDocNo: '',
    asnNo: '',
    vendorCode: '',
    customerId: '', 
    consigneeId: '', 
    poId: '',
    poNumber: '',
    poDate: '',
    vehicleNumber: '',
    transportMode: '',
    termsOfDelivery: '',
    
    buyerName: '',
    buyerAddress: '',
    buyerGstin: '',
    buyerState: '',
    buyerStateCode: '',
    buyerContactPerson: '',
    buyerContactNumber: '',
    buyerDepartment: '',
    buyerUser: '',
    
    consigneeName: '',
    consigneeAddress: '',
    consigneeGstin: '',
    consigneeState: '',
    consigneeStateCode: '',
    consigneeContactPerson: '',
    consigneeContactNumber: '',
    consigneeDepartment: '',
    consigneeUser: '',
    
    applyCgst: true,
    applySgst: true,
    applyIgst: false,
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 18,

    otherChargesDescription: '',
    otherChargesPercentage: 0,
  });

  const [items, setItems] = useState([
    { id: 1, productName: '', description: '', hsnCode: '', quantity: 0, rate: 0, amount: 0, poItemId: null, scheduleDeductions: [] }
  ]);

  const loadInitialData = useCallback(async () => {
    // Load optimized clients
    const { data: cData, error: cErr } = await getCachedCustomers();
    if (cErr) {
        if (isMounted.current) setClientsError("Failed to load customers.");
    } else if (cData && isMounted.current) {
        setClients(cData);
    }

    // Load optimized products list
    const { data: pData, error: pErr } = await getProductsPaginated(100, 0); // initial small batch
    if (pErr) {
        if (isMounted.current) setDataError("Failed to load products.");
    } else if (pData && isMounted.current) {
        setProducts(pData);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    loadInitialData();
    return () => { isMounted.current = false; };
  }, [loadInitialData]);

  const filteredBuyers = useMemo(() => {
    if (!buyerSearchTerm) return clients;
    return clients.filter(c => c.customer_name?.toLowerCase().includes(buyerSearchTerm.toLowerCase()));
  }, [clients, buyerSearchTerm]);

  const filteredConsignees = useMemo(() => {
    if (!consigneeSearchTerm) return clients;
    return clients.filter(c => c.customer_name?.toLowerCase().includes(consigneeSearchTerm.toLowerCase()));
  }, [clients, consigneeSearchTerm]);

  useEffect(() => {
      if (invoiceData?.id) {
          const populateForm = async () => {
              if (!isMounted.current) return;
              setLoading(true);
              setDataError(null);
              
              try {
                  const company = COMPANY_OPTIONS.find(c => c.name === invoiceData.company_name) || COMPANY_OPTIONS[0];
                  setSelectedCompany(company);

                  const hasIgst = invoiceData.tax_type === 'IGST';
                  const hasCgst = invoiceData.tax_type === 'CGST_ONLY' || invoiceData.tax_type === 'CGST_SGST';
                  const hasSgst = invoiceData.tax_type === 'SGST_ONLY' || invoiceData.tax_type === 'CGST_SGST';

                  const { data: itemsData, error: itemsError } = await fetchWithRetry(
                    (signal) => supabase.from('invoice_items').select('id, invoice_id, product_name, product_description, hsn_code, quantity, rate, amount, schedule_deductions').eq('invoice_id', invoiceData.id).abortSignal(signal),
                    { operationName: 'Fetch Invoice Items', timeoutMs: 15000 }
                  );
                  if (itemsError) throw itemsError;
                    
                  let currentInvoiceItems = itemsData || [];

                  let tempFormData = {
                    invoiceNumber: invoiceData.invoice_number || '', 
                    invoiceDate: invoiceData.invoice_date || '', 
                    referenceNo: invoiceData.reference_no || '',
                    referenceDate: invoiceData.reference_date || '',
                    dispatchDocNo: invoiceData.dispatch_doc_no || '',
                    asnNo: invoiceData.asn_no || '',
                    vendorCode: invoiceData.vendor_code || '',
                    customerId: invoiceData.customer_id || '',
                    consigneeId: '', 
                    poId: '', 
                    poNumber: invoiceData.po_number || '',
                    poDate: invoiceData.po_date || '',
                    vehicleNumber: invoiceData.vehicle_number || '',
                    transportMode: invoiceData.transport_mode || '',
                    termsOfDelivery: invoiceData.terms_of_delivery || '',
                    
                    buyerName: invoiceData.buyer_name || '',
                    buyerAddress: invoiceData.buyer_address || '',
                    buyerGstin: invoiceData.buyer_gstin || '',
                    buyerState: invoiceData.buyer_state || '',
                    buyerStateCode: invoiceData.buyer_state_code || '',
                    buyerContactPerson: invoiceData.buyer_contact_person || '',
                    buyerContactNumber: invoiceData.buyer_contact_number || '',
                    buyerDepartment: invoiceData.buyer_department || '',
                    buyerUser: invoiceData.buyer_user || '',
                    
                    consigneeName: invoiceData.consignee_name || '',
                    consigneeAddress: invoiceData.consignee_address || '',
                    consigneeGstin: invoiceData.consignee_gstin || '',
                    consigneeState: invoiceData.consignee_state || '',
                    consigneeStateCode: invoiceData.consignee_state_code || '',
                    consigneeContactPerson: invoiceData.consignee_contact_person || '',
                    consigneeContactNumber: invoiceData.consignee_contact_number || '',
                    consigneeDepartment: invoiceData.consignee_department || '',
                    consigneeUser: invoiceData.consignee_user || '',
                    
                    applyCgst: hasCgst,
                    applySgst: hasSgst,
                    applyIgst: hasIgst,
                    cgstRate: hasCgst ? (hasSgst ? invoiceData.tax_rate / 2 : invoiceData.tax_rate) : 9, 
                    sgstRate: hasSgst ? (hasCgst ? invoiceData.tax_rate / 2 : invoiceData.tax_rate) : 9,
                    igstRate: hasIgst ? invoiceData.tax_rate : 18,

                    otherChargesDescription: invoiceData.other_charges_description || '',
                    otherChargesPercentage: invoiceData.other_charges_percentage || 0,
                  };
                  
                  if (isMounted.current) {
                      setBuyerSearchTerm(invoiceData.buyer_name || '');
                      setConsigneeSearchTerm(invoiceData.consignee_name || '');
                  }

                  let fetchedPoItems = [];
                  let fetchedPoSchedules = {};

                  if (invoiceData.customer_id) {
                     const { data: pos } = await fetchWithRetry(
                        (signal) => supabase.from('purchase_order_receipts').select('id, order_receipt_id, purchase_order_date').eq('customer_id', invoiceData.customer_id).abortSignal(signal),
                        { operationName: 'Fetch Customer POs' }
                     );
                     if (isMounted.current) setCustomerPOs(pos || []);
                     
                     if (pos && invoiceData.po_number) {
                         const matchedPO = pos.find(p => p.order_receipt_id === invoiceData.po_number);
                         if (matchedPO) {
                             tempFormData.poId = matchedPO.id;
                             
                             const { data: pItems } = await getOptimizedPOItems(matchedPO.id);
                             fetchedPoItems = pItems || [];
                             if (isMounted.current) setPoItems(fetchedPoItems);
                             
                             if (fetchedPoItems.length > 0) {
                                 const itemIds = fetchedPoItems.map(i => i.id);
                                 const { data: sData } = await getOptimizedPOSchedules(itemIds);
                                 
                                 if (sData) {
                                     const sMap = {};
                                     sData.forEach(sch => {
                                         let restoredQty = parseFloat(sch.quantity) || 0;
                                         currentInvoiceItems.forEach(invItem => {
                                             if (invItem.schedule_deductions) {
                                                 invItem.schedule_deductions.forEach(ded => {
                                                     if (ded.schedule_id === sch.id) {
                                                         restoredQty += parseFloat(ded.amount) || 0;
                                                     }
                                                 });
                                             }
                                         });

                                         if (!sMap[sch.item_id]) sMap[sch.item_id] = [];
                                         sMap[sch.item_id].push({ ...sch, quantity: restoredQty });
                                     });
                                     
                                     Object.keys(sMap).forEach(key => {
                                         sMap[key].sort((a,b) => new Date(a.delivery_date) - new Date(b.delivery_date));
                                     });

                                     fetchedPoSchedules = sMap;
                                     if (isMounted.current) setPoSchedules(sMap);
                                 }
                             }
                         }
                     }
                  }

                  if (!isMounted.current) return;
                  setFormData(tempFormData);

                  if (currentInvoiceItems) {
                      setItems(currentInvoiceItems.map(i => {
                          let linkedPoItem = null;
                          let resolvedProductName = i.product_name;

                          if (fetchedPoItems.length > 0) {
                              linkedPoItem = fetchedPoItems.find(p => 
                                  (p.description === i.product_description) && 
                                  Math.abs((p.price_for_one || 0) - (i.rate || 0)) < 0.1
                              );
                              
                              if (!linkedPoItem && !resolvedProductName) {
                                  linkedPoItem = fetchedPoItems.find(p => Math.abs((p.price_for_one || 0) - (i.rate || 0)) < 0.1);
                              }
                              
                              if (linkedPoItem && !resolvedProductName) {
                                  resolvedProductName = linkedPoItem.product_name;
                              }
                          }

                          return {
                              id: i.id,
                              productName: resolvedProductName || '', 
                              description: i.product_description || '',
                              hsnCode: i.hsn_code || '',
                              quantity: i.quantity,
                              rate: i.rate,
                              amount: i.amount,
                              poItemId: linkedPoItem ? linkedPoItem.id : null, 
                              scheduleDeductions: i.schedule_deductions || []
                          };
                      }));
                  }
              } catch (err) {
                  if (isMounted.current) {
                      setDataError(`Failed to load invoice details: ${err.message}`);
                      toast({ title: "Error", description: err.message, variant: "destructive" });
                  }
              } finally {
                  if (isMounted.current) setLoading(false);
              }
          };
          populateForm();
      }
  }, [invoiceData?.id, toast]); 

  const fetchPOItemsAndSchedules = useCallback(async (poId, currentInvoiceItems = []) => {
    if (!poId) {
        setPoItems([]);
        setPoSchedules({});
        return;
    }
    const { data: itemsData, error: itemsError } = await getOptimizedPOItems(poId);

    if (itemsError || !isMounted.current) return;
    setPoItems(itemsData || []);

    if (itemsData && itemsData.length > 0) {
        const itemIds = itemsData.map(i => i.id);
        const { data: schedulesData } = await getOptimizedPOSchedules(itemIds);
        
        if (schedulesData && isMounted.current) {
            const schedulesMap = {};
            schedulesData.forEach(sch => {
                let restoredQty = parseFloat(sch.quantity) || 0;
                currentInvoiceItems.forEach(invItem => {
                    if (invItem.schedule_deductions) {
                        invItem.schedule_deductions.forEach(ded => {
                            if (ded.schedule_id === sch.id) {
                                restoredQty += parseFloat(ded.amount) || 0;
                            }
                        });
                    }
                });

                if (!schedulesMap[sch.item_id]) schedulesMap[sch.item_id] = [];
                schedulesMap[sch.item_id].push({ ...sch, quantity: restoredQty });
            });
            Object.keys(schedulesMap).forEach(key => {
                schedulesMap[key].sort((a,b) => new Date(a.delivery_date) - new Date(b.delivery_date));
            });
            setPoSchedules(schedulesMap);
        }
    } else if (isMounted.current) {
        setPoSchedules({});
    }
  }, []);

  const handleCompanyChange = useCallback((value) => {
    const company = COMPANY_OPTIONS.find(c => c.name === value);
    setSelectedCompany(company);
  }, []);

  const handleSelectCustomer = useCallback(async (customer, type = 'buyer') => {
      if (type === 'buyer') {
          setBuyerSearchTerm(customer.customer_name);
          setShowBuyerSuggestions(false);
          setFormData(prev => ({
              ...prev,
              customerId: customer.id,
              buyerName: customer.customer_name,
              buyerAddress: customer.address,
              buyerGstin: customer.gstin || '',
              buyerState: customer.state || '',
              buyerStateCode: customer.state_code || '',
              buyerContactPerson: customer.contact_person || '',
              buyerContactNumber: customer.contact_number || '',
              buyerDepartment: customer.department_name_1 || '',
              buyerUser: customer.user1 || '',
              consigneeId: !prev.consigneeId ? customer.id : prev.consigneeId,
              consigneeName: !prev.consigneeName ? customer.customer_name : prev.consigneeName,
              consigneeAddress: !prev.consigneeAddress ? customer.address : prev.consigneeAddress,
              consigneeGstin: !prev.consigneeGstin ? (customer.gstin || '') : prev.consigneeGstin,
              consigneeState: !prev.consigneeState ? (customer.state || '') : prev.consigneeState,
              consigneeStateCode: !prev.consigneeStateCode ? (customer.state_code || '') : prev.consigneeStateCode,
              consigneeContactPerson: !prev.consigneeContactPerson ? (customer.contact_person || '') : prev.consigneeContactPerson,
              consigneeContactNumber: !prev.consigneeContactNumber ? (customer.contact_number || '') : prev.consigneeContactNumber,
              consigneeDepartment: !prev.consigneeDepartment ? (customer.department_name_1 || '') : prev.consigneeDepartment,
              consigneeUser: !prev.consigneeUser ? (customer.user1 || '') : prev.consigneeUser,
              poId: '',
              poNumber: '',
              poDate: '',
          }));
          
          setConsigneeSearchTerm(prev => prev ? prev : customer.customer_name);
          setPoItems([]);
          setPoSchedules({});
          
          const { data } = await fetchWithRetry(
              () => supabase.from('purchase_order_receipts').select('id, order_receipt_id, purchase_order_date').eq('customer_id', customer.id),
              { operationName: 'Fetch Customer POs for Selection' }
          );
          if (isMounted.current) setCustomerPOs(data || []);
      } else {
          setConsigneeSearchTerm(customer.customer_name);
          setShowConsigneeSuggestions(false);
          setFormData(prev => ({
              ...prev,
              consigneeId: customer.id,
              consigneeName: customer.customer_name,
              consigneeAddress: customer.address,
              consigneeGstin: customer.gstin || '',
              consigneeState: customer.state || '',
              consigneeStateCode: customer.state_code || '',
              consigneeContactPerson: customer.contact_person || '',
              consigneeContactNumber: customer.contact_number || '',
              consigneeDepartment: customer.department_name_1 || '',
              consigneeUser: customer.user1 || '',
          }));
      }
  }, []);

  const handlePOChange = useCallback(async (poId) => {
    const po = customerPOs.find(p => p.id === poId);
    if (po) {
      setFormData(prev => ({
        ...prev,
        poId: po.id,
        poNumber: po.order_receipt_id, 
        poDate: po.purchase_order_date || '',
      }));
      await fetchPOItemsAndSchedules(po.id);
      if (!loading && !isViewMode && isMounted.current) {
          setItems([{ id: Date.now(), productName: '', description: '', hsnCode: '', quantity: 0, rate: 0, amount: 0, poItemId: null, scheduleDeductions: [] }]);
      }
    }
  }, [customerPOs, fetchPOItemsAndSchedules, isViewMode, loading]);

  const handleItemChange = useCallback((id, field, value) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          newItem.amount = (parseFloat(newItem.quantity || 0) * parseFloat(newItem.rate || 0));
        }

        // Optimized automatic schedule deduction logic
        if (field === 'quantity' && newItem.poItemId) {
            const qty = parseFloat(value) || 0;
            let remaining = qty;
            const deductions = [];
            const schedules = poSchedules[newItem.poItemId] || [];

            for (let i = 0; i < schedules.length; i++) {
                if (remaining <= 0) break;
                const sch = schedules[i];
                const available = parseFloat(sch.quantity) || 0;
                if (available > 0) {
                    const deduct = Math.min(available, remaining);
                    deductions.push({ schedule_id: sch.id, amount: deduct });
                    remaining -= deduct;
                }
            }
            newItem.scheduleDeductions = deductions;
        }

        return newItem;
      }
      return item;
    }));
  }, [poSchedules]);

  const handleProductSelect = useCallback((id, productName) => {
     setItems(prevItems => prevItems.map(item => {
        if (item.id === id) {
          return { ...item, productName: productName, description: productName };
        }
        return item;
      }));
  }, []);

  const handlePOItemSelect = useCallback((rowId, poItemId) => {
      const selectedItem = poItems.find(i => i.id === poItemId);
      if (selectedItem) {
          setItems(prevItems => prevItems.map(item => {
              if (item.id === rowId) {
                  return {
                      ...item,
                      poItemId: poItemId,
                      productName: selectedItem.product_name || '',
                      description: selectedItem.description || '',
                      rate: selectedItem.price_for_one || 0,
                      quantity: 0,
                      amount: 0,
                      scheduleDeductions: [],
                      hsnCode: '' 
                  };
              }
              return item;
          }));
      }
  }, [poItems]);

  const addItem = useCallback(() => {
    setItems(prev => [...prev, { id: Date.now(), productName: '', description: '', hsnCode: '', quantity: 0, rate: 0, amount: 0, poItemId: null, scheduleDeductions: [] }]);
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.length > 1 ? prev.filter(item => item.id !== id) : prev);
  }, []);

  const handleTaxCheckboxChange = useCallback((type, checked) => {
      setFormData(prev => {
          const newData = { ...prev };
          if (type === 'IGST') {
              newData.applyIgst = checked;
              if (checked) { newData.applyCgst = false; newData.applySgst = false; }
          } else if (type === 'CGST') {
              newData.applyCgst = checked;
              if (checked) newData.applyIgst = false;
          } else if (type === 'SGST') {
              newData.applySgst = checked;
              if (checked) newData.applyIgst = false;
          }
          return newData;
      });
  }, []);

  const handleClientAdded = useCallback(() => {
    loadInitialData();
    setIsAddClientOpen(false);
    toast({ title: "Success", description: "Client added successfully" });
  }, [loadInitialData, toast]);

  const handleClientUpdated = useCallback(() => {
    loadInitialData();
    setIsEditClientOpen(false);
    setEditingClientId(null);
    toast({ title: "Success", description: "Client updated successfully" });
  }, [loadInitialData, toast]);

  const totals = useMemo(() => {
    const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    let cgst = 0, sgst = 0, igst = 0;
    if (formData.applyCgst) cgst = (subTotal * parseFloat(formData.cgstRate)) / 100;
    if (formData.applySgst) sgst = (subTotal * parseFloat(formData.sgstRate)) / 100;
    if (formData.applyIgst) igst = (subTotal * parseFloat(formData.igstRate)) / 100;
    const totalTaxAmount = cgst + sgst + igst;
    
    const otherChargesAmount = (subTotal * (parseFloat(formData.otherChargesPercentage) || 0)) / 100;
    
    const grandTotal = subTotal + totalTaxAmount + otherChargesAmount;
    const uniqueHsn = [...new Set(items.map(i => i.hsnCode).filter(Boolean))].join(', ');

    return { 
      subTotal, 
      cgst, 
      sgst, 
      igst, 
      totalTaxAmount, 
      otherChargesAmount,
      grandTotal, 
      amountInWords: numberToWords(grandTotal), 
      taxAmountInWords: numberToWords(totalTaxAmount), 
      uniqueHsn 
    };
  }, [items, formData.applyCgst, formData.applySgst, formData.applyIgst, formData.cgstRate, formData.sgstRate, formData.igstRate, formData.otherChargesPercentage]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!formData.customerId) throw new Error("Please select a customer (Buyer)");
      if (items.some(i => !i.description)) throw new Error("Please enter product descriptions");
      if (!formData.invoiceNumber) throw new Error("Invoice Number is required.");
      if (!formData.invoiceDate) throw new Error("Invoice Date is required.");

      let taxType = 'NONE';
      if (formData.applyIgst) taxType = 'IGST';
      else if (formData.applyCgst && formData.applySgst) taxType = 'CGST_SGST';
      else if (formData.applyCgst) taxType = 'CGST_ONLY';
      else if (formData.applySgst) taxType = 'SGST_ONLY';

      const invoicePayload = {
        invoice_number: formData.invoiceNumber,
        invoice_date: formData.invoiceDate,
        reference_no: formData.referenceNo,
        reference_date: formData.referenceDate || null,
        dispatch_doc_no: formData.dispatchDocNo,
        asn_no: formData.asnNo,
        terms_of_delivery: formData.termsOfDelivery,
        company_name: selectedCompany.name,
        company_address: selectedCompany.address,
        company_gstin: selectedCompany.gstin,
        company_state: selectedCompany.state,
        company_district: selectedCompany.district,
        vendor_code: formData.vendorCode,
        customer_id: formData.customerId,
        buyer_name: formData.buyerName,
        buyer_address: formData.buyerAddress,
        buyer_gstin: formData.buyerGstin,
        buyer_state: formData.buyerState,
        buyer_state_code: formData.buyerStateCode,
        buyer_contact_person: formData.buyer_contact_person,
        buyer_contact_number: formData.buyer_contact_number,
        buyer_department: formData.buyer_department,
        buyer_user: formData.buyer_user,
        consignee_name: formData.consigneeName,
        consignee_address: formData.consigneeAddress,
        consignee_gstin: formData.consigneeGstin,
        consignee_state: formData.consigneeState,
        consignee_state_code: formData.consigneeStateCode,
        consignee_contact_person: formData.consignee_contact_person,
        consignee_contact_number: formData.consignee_contact_number,
        consignee_department: formData.consignee_department,
        consignee_user: formData.consignee_user,
        po_number: formData.poNumber,
        po_date: formData.poDate || null,
        vehicle_number: formData.vehicleNumber,
        transport_mode: formData.transportMode,
        total_amount: totals.grandTotal,
        amount_in_words: totals.amountInWords,
        tax_type: taxType,
        tax_rate: formData.applyIgst ? formData.igstRate : (parseFloat(formData.cgstRate) + parseFloat(formData.sgstRate)),
        taxable_amount: totals.subTotal,
        cgst_amount: totals.cgst,
        sgst_amount: totals.sgst,
        igst_amount: totals.igst,
        other_charges_description: formData.otherChargesDescription,
        other_charges_percentage: parseFloat(formData.otherChargesPercentage) || 0
      };

      let currentInvoiceId;

      if (invoiceData) {
          const { data: oldItems } = await supabase.from('invoice_items').select('schedule_deductions').eq('invoice_id', invoiceData.id);
          if (oldItems) {
              for (const old of oldItems) {
                  if (old.schedule_deductions) {
                      for (const ded of old.schedule_deductions) {
                          const { data: sch } = await supabase.from('purchase_order_receipt_items_delivery_schedules').select('quantity').eq('id', ded.schedule_id).single();
                          if (sch) {
                              const restored = (parseFloat(sch.quantity) || 0) + parseFloat(ded.amount);
                              await supabase.from('purchase_order_receipt_items_delivery_schedules').update({ quantity: restored }).eq('id', ded.schedule_id);
                          }
                      }
                  }
              }
          }

          const { error: updateError } = await supabase
             .from('invoices')
             .update(invoicePayload)
             .eq('id', invoiceData.id);
          
          if (updateError) throw updateError;
          currentInvoiceId = invoiceData.id;

          const { error: deleteError } = await supabase
             .from('invoice_items')
             .delete()
             .eq('invoice_id', currentInvoiceId);
          if (deleteError) throw deleteError;

          toast({ title: "Updated", description: "Invoice updated successfully!" });
      } else {
          const { data: invoice, error: invError } = await supabase.from('invoices').insert([invoicePayload]).select().single();
          if (invError) throw invError;
          currentInvoiceId = invoice.id;
          toast({ title: "Created", description: "Invoice created successfully!" });
      }

      const invoiceItems = items.map(item => ({
        invoice_id: currentInvoiceId,
        product_name: item.productName, 
        product_description: item.description,
        hsn_code: item.hsnCode,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        schedule_deductions: item.scheduleDeductions || null
      }));

      const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);
      if (itemsError) throw itemsError;

      for (const item of items) {
          if (item.scheduleDeductions && item.scheduleDeductions.length > 0) {
              for (const ded of item.scheduleDeductions) {
                  const { data: sch } = await supabase.from('purchase_order_receipt_items_delivery_schedules').select('quantity').eq('id', ded.schedule_id).single();
                  if (sch) {
                      const newQty = Math.max(0, (parseFloat(sch.quantity) || 0) - parseFloat(ded.amount));
                      await supabase.from('purchase_order_receipt_items_delivery_schedules').update({ quantity: newQty }).eq('id', ded.schedule_id);
                  }
              }
          }
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const formatDateForPDF = (dateStr) => {
      if (!dateStr) return '-';
      try {
        return format(new Date(dateStr), 'dd-MM-yyyy');
      } catch (e) {
        return dateStr;
      }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const startX = 14;
    const endX = pageWidth - 14;
    const padding = 4;
    const headerStartY = 10;
    let currentY = headerStartY + 5;

    doc.setFontSize(18); 
    doc.setFont('helvetica', 'bold');
    doc.text(selectedCompany.name || 'Company Name', pageWidth / 2, currentY, { align: 'center' });
    currentY += 7;
    doc.setFontSize(14); 
    doc.text("Tax Invoice", pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;
    doc.setFontSize(9); 
    doc.setFont('helvetica', 'normal');
    doc.text(`${selectedCompany.address}, ${selectedCompany.district}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
    doc.text(`GSTIN: ${selectedCompany.gstin} | State: ${selectedCompany.state} (${selectedCompany.code})`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 2; 

    doc.rect(startX, headerStartY, endX - startX, currentY - headerStartY);
    currentY += 2; 

    const startDetailsY = currentY;
    const rowH = 6; 
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const leftColData = [
        { label: "Invoice No", val: formData.invoiceNumber },
        { label: "Reference No", val: formData.referenceNo || '-' },
        { label: "PO No", val: formData.poNumber || '-' },
        { label: "Dispatched Through", val: formData.transportMode || '-' },
        { label: "Vehicle No", val: formData.vehicleNumber || '-' },
    ];

    const rightColData = [
        { label: "Invoice Date", val: formatDateForPDF(formData.invoiceDate) },
        { label: "Reference Date", val: formatDateForPDF(formData.referenceDate) },
        { label: "PO Date", val: formatDateForPDF(formData.poDate) }, 
        { label: "Vendor Code", val: formData.vendorCode || '-' },
        { label: "Dispatch Doc No", val: formData.dispatchDocNo || '-' },
        { label: "ASN No", val: formData.asnNo || '-' },
    ];

    const maxRows = Math.max(leftColData.length, rightColData.length);
    let currentGridY = startDetailsY;
    const col2X = pageWidth / 2;

    for (let i = 0; i < maxRows; i++) {
        if (i < leftColData.length) {
            doc.text(`${leftColData[i].label}: ${leftColData[i].val}`, startX + padding, currentGridY + 4);
        }
        if (i < rightColData.length) {
            doc.text(`${rightColData[i].label}: ${rightColData[i].val}`, col2X + padding, currentGridY + 4);
        }
        doc.line(startX, currentGridY + rowH, endX, currentGridY + rowH);
        currentGridY += rowH;
    }

    const midLineY = currentGridY;
    let addressY = midLineY + padding + 3;
    const rightColX = pageWidth / 2 + 2;
    
    // Calculate heights dynamically for addresses
    doc.setFontSize(9);
    const buyerAddrLines = doc.splitTextToSize(formData.buyerAddress || '', 80);
    const consigneeAddrLines = doc.splitTextToSize(formData.consigneeAddress || '', 80);
    const buyerAddrHeight = buyerAddrLines.length * 3.5;
    const consigneeAddrHeight = consigneeAddrLines.length * 3.5;

    // Buyer Column
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To (Buyer):', startX + padding, addressY);
    doc.setFont('helvetica', 'normal');
    doc.text(formData.buyerName || '', startX + padding, addressY + 4);
    doc.text(buyerAddrLines, startX + padding, addressY + 8);
    let buyerY = addressY + 8 + buyerAddrHeight + 3;
    doc.text(`GSTIN: ${formData.buyerGstin || '-'}`, startX + padding, buyerY);
    buyerY += 4;
    doc.text(`State: ${formData.buyerState || '-'} (${formData.buyerStateCode || '-'})`, startX + padding, buyerY);
    buyerY += 4;
    doc.text(`Contact: ${formData.buyerContactPerson || '-'}`, startX + padding, buyerY);
    buyerY += 4;
    doc.text(`Phone: ${formData.buyerContactNumber || '-'}`, startX + padding, buyerY);
    buyerY += 4;
    doc.text(`Dept: ${formData.buyerDepartment || '-'}`, startX + padding, buyerY);
    buyerY += 4;
    doc.text(`User: ${formData.buyerUser || '-'}`, startX + padding, buyerY);

    // Consignee Column
    doc.setFont('helvetica', 'bold');
    doc.text('Ship To (Consignee):', rightColX, addressY);
    doc.setFont('helvetica', 'normal');
    doc.text(formData.consigneeName || '', rightColX, addressY + 4);
    doc.text(consigneeAddrLines, rightColX, addressY + 8);
    let consigneeY = addressY + 8 + consigneeAddrHeight + 3;
    doc.text(`GSTIN: ${formData.consigneeGstin || '-'}`, rightColX, consigneeY);
    consigneeY += 4;
    doc.text(`State: ${formData.consigneeState || '-'} (${formData.consigneeStateCode || '-'})`, rightColX, consigneeY);
    consigneeY += 4;
    doc.text(`Contact: ${formData.consigneeContactPerson || '-'}`, rightColX, consigneeY);
    consigneeY += 4;
    doc.text(`Phone: ${formData.consigneeContactNumber || '-'}`, rightColX, consigneeY);
    consigneeY += 4;
    doc.text(`Dept: ${formData.consigneeDepartment || '-'}`, rightColX, consigneeY);
    consigneeY += 4;
    doc.text(`User: ${formData.consigneeUser || '-'}`, rightColX, consigneeY);

    const addressBlockHeight = Math.max(
        (buyerY + 2) - midLineY,
        (consigneeY + 2) - midLineY
    );
    const boxBottomY = midLineY + addressBlockHeight;

    doc.rect(startX, startDetailsY, endX - startX, boxBottomY - startDetailsY);
    doc.line(pageWidth / 2, startDetailsY, pageWidth / 2, boxBottomY);

    autoTable(doc, {
        startY: boxBottomY + 2, 
        columns: [
            { header: 'SN', dataKey: 'sn' },
            { header: 'Product Name', dataKey: 'productName' }, 
            { header: 'Description of Goods', dataKey: 'desc' },
            { header: 'HSN/SAC', dataKey: 'hsn' },
            { header: 'Qty', dataKey: 'qty' },
            { header: 'Rate', dataKey: 'rate' },
            { header: 'Amount', dataKey: 'amount' },
        ],
        body: items.map((item, index) => ({
            sn: index + 1,
            productName: item.productName || item.description || '', 
            desc: item.description,
            hsn: item.hsnCode,
            qty: item.quantity,
            rate: item.rate,
            amount: item.amount.toFixed(2),
        })),
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        footStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold' },
        margin: { left: startX, right: startX },
        tableWidth: 'auto'
    });

    let finalY = doc.lastAutoTable.finalY;
    currentY = finalY + 2; 

    const totalsWidth = 90;
    const totalsX = endX - totalsWidth;
    const rowHeight = 6; 

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.rect(totalsX, currentY, totalsWidth, rowHeight);
    doc.text('Taxable Amount:', totalsX + 2, currentY + 4);
    doc.text(totals.subTotal.toFixed(2), endX - 2, currentY + 4, { align: 'right' });
    doc.line(totalsX + 45, currentY, totalsX + 45, currentY + rowHeight);
    currentY += rowHeight;

    if (formData.applyCgst) {
        doc.rect(totalsX, currentY, totalsWidth, rowHeight);
        doc.text(`CGST (${formData.cgstRate}%):`, totalsX + 2, currentY + 4);
        doc.text(totals.cgst.toFixed(2), endX - 2, currentY + 4, { align: 'right' });
        doc.line(totalsX + 45, currentY, totalsX + 45, currentY + rowHeight);
        currentY += rowHeight;
    }
    if (formData.applySgst) {
        doc.rect(totalsX, currentY, totalsWidth, rowHeight);
        doc.text(`SGST (${formData.sgstRate}%):`, totalsX + 2, currentY + 4);
        doc.text(totals.sgst.toFixed(2), endX - 2, currentY + 4, { align: 'right' });
        doc.line(totalsX + 45, currentY, totalsX + 45, currentY + rowHeight);
        currentY += rowHeight;
    }
    if (formData.applyIgst) {
        doc.rect(totalsX, currentY, totalsWidth, rowHeight);
        doc.text(`IGST (${formData.igstRate}%):`, totalsX + 2, currentY + 4);
        doc.text(totals.igst.toFixed(2), endX - 2, currentY + 4, { align: 'right' });
        doc.line(totalsX + 45, currentY, totalsX + 45, currentY + rowHeight);
        currentY += rowHeight;
    }

    if (formData.otherChargesPercentage > 0) {
        doc.rect(totalsX, currentY, totalsWidth, rowHeight);
        doc.text(`${formData.otherChargesDescription || 'Other Charges'} (${formData.otherChargesPercentage}%):`, totalsX + 2, currentY + 4);
        doc.text(totals.otherChargesAmount.toFixed(2), endX - 2, currentY + 4, { align: 'right' });
        doc.line(totalsX + 45, currentY, totalsX + 45, currentY + rowHeight);
        currentY += rowHeight;
    }

    doc.setFont('helvetica', 'bold');
    doc.rect(totalsX, currentY, totalsWidth, rowHeight + 2);
    doc.text('Grand Total:', totalsX + 2, currentY + 5);
    doc.text(totals.grandTotal.toFixed(2), endX - 2, currentY + 5, { align: 'right' });
    currentY += (rowHeight + 2 + 4); 

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const amountLabel = 'Total Amount Chargeable in Words:';
    const amountWordsLines = doc.splitTextToSize(`${amountLabel} ${totals.amountInWords}`, endX - startX - 2 * padding);
    const amountBoxHeight = (amountWordsLines.length * 4) + 4;
    doc.rect(startX, currentY, endX - startX, amountBoxHeight);
    doc.text(amountWordsLines, startX + padding, currentY + 4);
    currentY += amountBoxHeight + 3; 

    doc.setFont('helvetica', 'bold');
    doc.text('Tax Details:', startX, currentY);
    currentY += 2;

    const taxTableColumns = [
        { header: 'HSN/SAC', dataKey: 'hsn' },
        { header: 'Taxable Value', dataKey: 'taxable' },
        ...(formData.applyCgst ? [{ header: `CGST (${formData.cgstRate}%)`, dataKey: 'cgst' }] : []),
        ...(formData.applySgst ? [{ header: `SGST (${formData.sgstRate}%)`, dataKey: 'sgst' }] : []),
        ...(formData.applyIgst ? [{ header: `IGST (${formData.igstRate}%)`, dataKey: 'igst' }] : []),
        { header: 'Total Tax', dataKey: 'totalTax' }
    ];

    const taxTableRows = [{
        hsn: totals.uniqueHsn || '-',
        taxable: totals.subTotal.toFixed(2),
        ...(formData.applyCgst ? { cgst: totals.cgst.toFixed(2) } : {}),
        ...(formData.applySgst ? { sgst: totals.sgst.toFixed(2) } : {}),
        ...(formData.applyIgst ? { igst: totals.igst.toFixed(2) } : {}),
        totalTax: totals.totalTaxAmount.toFixed(2)
    }];

    autoTable(doc, {
        startY: currentY + 1,
        columns: taxTableColumns,
        body: taxTableRows,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', halign: 'center', lineWidth: 0.1, lineColor: 0, fontSize: 7 },
        bodyStyles: { halign: 'center', lineWidth: 0.1, lineColor: 0, fontSize: 7 },
        styles: { cellPadding: 1 },
        margin: { left: startX, right: startX }
    });

    currentY = doc.lastAutoTable.finalY + 3;
    const taxLabel = 'Total Tax Amount in Words:';
    const taxWordsLines = doc.splitTextToSize(`${taxLabel} ${totals.taxAmountInWords}`, endX - startX - 2 * padding);
    const taxBoxHeight = (taxWordsLines.length * 4) + 4;
    doc.rect(startX, currentY, endX - startX, taxBoxHeight);
    doc.text(taxWordsLines, startX + padding, currentY + 4);
    currentY += taxBoxHeight + 5;

    if (formData.termsOfDelivery) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        const termLabel = "Terms of Delivery:";
        const termsLines = doc.splitTextToSize(formData.termsOfDelivery, endX - startX - 2 * padding);
        const termBoxHeight = (termsLines.length * 4) + 10;
        if (currentY + termBoxHeight > pageHeight - 30) {
            doc.addPage();
            currentY = 20;
        }
        doc.rect(startX, currentY, endX - startX, termBoxHeight);
        doc.text(termLabel, startX + padding, currentY + 4);
        doc.setFont('helvetica', 'normal');
        doc.text(termsLines, startX + padding, currentY + 9);
        currentY += termBoxHeight + 5;
    }

    const declarationText = "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.";
    const declLines = doc.splitTextToSize(declarationText, endX - startX - 2 * padding); 
    const declHeight = (declLines.length * 4) + 12; 
    if (currentY + declHeight + 40 > pageHeight) {
        doc.addPage();
        currentY = 20;
    }
    doc.rect(startX, currentY, endX - startX, declHeight);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Declaration:', startX + padding, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(declLines, startX + padding, currentY + 10);
    
    const signatureY = currentY + declHeight + 25; 
    const rightMargin = endX;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`For ${selectedCompany.name}`, rightMargin, signatureY, { align: 'right' });
    doc.text('Authorised Signatory', rightMargin, signatureY + 15, { align: 'right' });

    doc.save(`Invoice_${formData.invoiceNumber || 'Draft'}.pdf`);
  };

  return (
    <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl mx-auto h-[90vh] flex flex-col">
      <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg shrink-0">
        <h2 className="text-xl font-bold text-gray-800">
            {invoiceData ? (isViewMode ? 'View Invoice' : 'Edit Invoice') : 'Create New Invoice'}
        </h2>
        <div className="flex gap-2">
           <Button variant="outline" onClick={onClose} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white border-none">Close</Button>
           
           {invoiceData && isViewMode ? (
               <Button onClick={() => setIsViewMode(false)} variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-200">
                   <Edit className="w-4 h-4 mr-2" /> Enable Editing
               </Button>
           ) : (
               <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 
                  {loading ? 'Saving...' : (invoiceData ? 'Update Invoice' : 'Save Invoice')}
               </Button>
           )}

           <Button onClick={generatePDF} variant="secondary" className="bg-blue-600 hover:bg-blue-700 text-white">
             <FileDown className="w-4 h-4 mr-2" />
             Save as PDF
           </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {(dataError || clientsError) && (
            <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>{dataError || clientsError}</AlertDescription>
            </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Company Section */}
            <div className="space-y-4 border p-4 rounded-md bg-blue-50/30">
                <h3 className="font-semibold text-blue-800">Company Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <Label>Select Company</Label>
                        <Select value={selectedCompany.name} onValueChange={handleCompanyChange} disabled={isViewMode}>
                            <SelectTrigger disabled={isViewMode}>
                                <SelectValue placeholder="Select Company" />
                            </SelectTrigger>
                            <SelectContent>
                                {COMPANY_OPTIONS.map(opt => (
                                    <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600 space-y-1">
                        <p><strong>Address:</strong> {selectedCompany.address}, {selectedCompany.district}</p>
                        <p><strong>State:</strong> {selectedCompany.state} (Code: {selectedCompany.code})</p>
                        <p><strong>GSTIN:</strong> {selectedCompany.gstin}</p>
                    </div>
                    <div>
                        <Label>Vendor Code</Label>
                        <Input 
                            value={formData.vendorCode} 
                            onChange={(e) => setFormData(prev => ({...prev, vendorCode: e.target.value}))}
                            placeholder="Enter Vendor Code"
                            disabled={isViewMode}
                        />
                    </div>
                </div>
            </div>

            {/* Invoice Meta Section */}
            <div className="space-y-2">
                 <h3 className="font-semibold text-gray-800">Invoice Details</h3>
                 <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
                    <div className="grid grid-cols-2 bg-gray-50/50">
                        <div className="p-4 border-b border-r border-gray-300">
                           <Label className="text-xs text-gray-500">Invoice No.</Label>
                           <Input className="h-8" value={formData.invoiceNumber} onChange={(e) => setFormData(prev => ({...prev, invoiceNumber: e.target.value}))} disabled={isViewMode} />
                        </div>
                        <div className="p-4 border-b border-gray-300">
                           <Label className="text-xs text-gray-500">Invoice Date</Label>
                           <Input className="h-8" type="date" value={formData.invoiceDate} onChange={(e) => setFormData(prev => ({...prev, invoiceDate: e.target.value}))} disabled={isViewMode} />
                        </div>
                        <div className="p-4 border-b border-r border-gray-300">
                           <Label className="text-xs text-gray-500">Reference No.</Label>
                           <Input className="h-8" value={formData.referenceNo} onChange={(e) => setFormData(prev => ({...prev, referenceNo: e.target.value}))} disabled={isViewMode} />
                        </div>
                        <div className="p-4 border-b border-gray-300">
                           <Label className="text-xs text-gray-500">Reference Date</Label>
                           <Input className="h-8" type="date" value={formData.referenceDate} onChange={(e) => setFormData(prev => ({...prev, referenceDate: e.target.value}))} disabled={isViewMode} />
                        </div>
                        <div className="p-4 border-b border-r border-gray-300">
                           <Label className="text-xs text-gray-500">Dispatch Doc No.</Label>
                           <Input className="h-8" value={formData.dispatchDocNo} onChange={(e) => setFormData(prev => ({...prev, dispatchDocNo: e.target.value}))} disabled={isViewMode} />
                        </div>
                        <div className="p-4 border-b border-gray-300">
                           <Label className="text-xs text-gray-500">ASN No.</Label>
                           <Input className="h-8" value={formData.asnNo} onChange={(e) => setFormData(prev => ({...prev, asnNo: e.target.value}))} disabled={isViewMode} />
                        </div>
                        <div className="p-4 border-r border-gray-300">
                           <Label className="text-xs text-gray-500">Dispatched Through</Label>
                           <Input className="h-8" value={formData.transportMode} onChange={(e) => setFormData(prev => ({...prev, transportMode: e.target.value}))} disabled={isViewMode} />
                        </div>
                        <div className="p-4">
                           <Label className="text-xs text-gray-500">Vehicle Number</Label>
                           <Input className="h-8" value={formData.vehicleNumber} onChange={(e) => setFormData(prev => ({...prev, vehicleNumber: e.target.value}))} disabled={isViewMode} />
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50">
                         <Label className="text-xs text-gray-500">Terms of Delivery</Label>
                         <Textarea 
                            value={formData.termsOfDelivery}
                            onChange={(e) => setFormData(prev => ({...prev, termsOfDelivery: e.target.value}))}
                            placeholder="Terms of Delivery"
                            className="h-16 mt-1 bg-white"
                            disabled={isViewMode}
                        />
                    </div>
                 </div>
            </div>
        </div>

        {/* Bill To & Ship To - Styled Table Layout */}
        <div className="mb-8">
            <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col md:flex-row">
                 {/* Bill To */}
                 <div className="w-full md:w-1/2 p-4 border-b md:border-b-0 md:border-r border-gray-300">
                    <div className="mb-4 pb-2 border-b flex justify-between items-center">
                         <span className="font-semibold text-gray-700">Bill To (Buyer)</span>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="relative">
                            <Label className="text-xs text-gray-500 mb-1 block">Customer Name</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                                <Input 
                                    className="h-8 pl-8"
                                    placeholder="Search Customer..." 
                                    value={buyerSearchTerm} 
                                    onChange={(e) => {
                                        setBuyerSearchTerm(e.target.value);
                                        setShowBuyerSuggestions(true);
                                    }}
                                    onFocus={() => setShowBuyerSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowBuyerSuggestions(false), 200)}
                                    disabled={isViewMode}
                                />
                            </div>
                            {showBuyerSuggestions && !isViewMode && (
                                <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-auto mt-1">
                                    {filteredBuyers.map(c => (
                                        <div 
                                            key={c.id} 
                                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                            onMouseDown={(e) => { e.preventDefault(); handleSelectCustomer(c, 'buyer'); }}
                                        >
                                            {c.customer_name}
                                        </div>
                                    ))}
                                    {filteredBuyers.length === 0 && <div className="p-2 text-sm text-gray-500">No customers found</div>}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <Label className="text-xs text-gray-500">Contact Person</Label>
                                <Input className="h-8" value={formData.buyerContactPerson} onChange={(e) => setFormData(prev => ({...prev, buyerContactPerson: e.target.value}))} disabled={isViewMode} />
                             </div>
                             <div>
                                <Label className="text-xs text-gray-500">Contact Number</Label>
                                <Input className="h-8" value={formData.buyerContactNumber} onChange={(e) => setFormData(prev => ({...prev, buyerContactNumber: e.target.value}))} disabled={isViewMode} />
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <Label className="text-xs text-gray-500">Department</Label>
                                <Input className="h-8" value={formData.buyerDepartment} onChange={(e) => setFormData(prev => ({...prev, buyerDepartment: e.target.value}))} disabled={isViewMode} />
                             </div>
                             <div>
                                <Label className="text-xs text-gray-500">User</Label>
                                <Input className="h-8" value={formData.buyerUser} onChange={(e) => setFormData(prev => ({...prev, buyerUser: e.target.value}))} disabled={isViewMode} />
                             </div>
                        </div>
                        
                        <div>
                            <Label className="text-xs text-gray-500">Address</Label>
                            <Textarea value={formData.buyerAddress} onChange={(e) => setFormData(prev => ({...prev, buyerAddress: e.target.value}))} className="h-16 text-sm mb-2" placeholder="Address" disabled={isViewMode} />
                        </div>
                        <div className="grid grid-cols-1 gap-2 mb-2">
                            <Label className="text-xs text-gray-500">GSTIN</Label>
                            <Input className="h-8" placeholder="GSTIN" value={formData.buyerGstin} onChange={(e) => setFormData(prev => ({...prev, buyerGstin: e.target.value}))} disabled={isViewMode} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div><Label className="text-xs text-gray-500">State</Label><Input className="h-8" placeholder="State" value={formData.buyerState} onChange={(e) => setFormData(prev => ({...prev, buyerState: e.target.value}))} disabled={isViewMode} /></div>
                            <div><Label className="text-xs text-gray-500">State Code</Label><Input className="h-8" placeholder="State Code" value={formData.buyerStateCode} onChange={(e) => setFormData(prev => ({...prev, buyerStateCode: e.target.value}))} disabled={isViewMode} /></div>
                        </div>
                    </div>
                 </div>

                 {/* Ship To */}
                 <div className="w-full md:w-1/2 p-4">
                     <div className="mb-4 pb-2 border-b flex justify-between items-center">
                         <span className="font-semibold text-gray-700">Ship To (Consignee)</span>
                         {!isViewMode && (
                             <Button variant="ghost" className="h-auto text-sm font-bold text-blue-700 hover:text-blue-800" onClick={() => {
                                 setConsigneeSearchTerm(formData.buyerName);
                                 setFormData(prev => ({
                                    ...prev,
                                    consigneeId: prev.customerId,
                                    consigneeName: prev.buyerName,
                                    consigneeAddress: prev.buyerAddress,
                                    consigneeGstin: prev.buyerGstin,
                                    consigneeState: prev.buyerState,
                                    consigneeStateCode: prev.buyerStateCode,
                                    consigneeContactPerson: prev.buyerContactPerson,
                                    consigneeContactNumber: prev.buyerContactNumber,
                                    consigneeDepartment: prev.buyerDepartment,
                                    consigneeUser: prev.buyerUser
                                }));
                             }}>Copy Buyer's Information</Button>
                         )}
                    </div>

                    <div className="space-y-3">
                        <div className="relative">
                            <Label className="text-xs text-gray-500 mb-1 block">Consignee Name</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                                <Input 
                                    className="h-8 pl-8"
                                    placeholder="Search Consignee..." 
                                    value={consigneeSearchTerm} 
                                    onChange={(e) => {
                                        setConsigneeSearchTerm(e.target.value);
                                        setShowConsigneeSuggestions(true);
                                    }}
                                    onFocus={() => setShowConsigneeSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowConsigneeSuggestions(false), 200)}
                                    disabled={isViewMode}
                                />
                            </div>
                            {showConsigneeSuggestions && !isViewMode && (
                                <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-auto mt-1">
                                    {filteredConsignees.map(c => (
                                        <div 
                                            key={c.id} 
                                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                            onMouseDown={(e) => { e.preventDefault(); handleSelectCustomer(c, 'consignee'); }}
                                        >
                                            {c.customer_name}
                                        </div>
                                    ))}
                                    {filteredConsignees.length === 0 && <div className="p-2 text-sm text-gray-500">No customers found</div>}
                                </div>
                            )}
                        </div>

                         <div className="grid grid-cols-2 gap-2">
                             <div>
                                <Label className="text-xs text-gray-500">Contact Person</Label>
                                <Input className="h-8" value={formData.consigneeContactPerson} onChange={(e) => setFormData(prev => ({...prev, consigneeContactPerson: e.target.value}))} disabled={isViewMode} />
                             </div>
                             <div>
                                <Label className="text-xs text-gray-500">Contact Number</Label>
                                <Input className="h-8" value={formData.consigneeContactNumber} onChange={(e) => setFormData(prev => ({...prev, consigneeContactNumber: e.target.value}))} disabled={isViewMode} />
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <Label className="text-xs text-gray-500">Department</Label>
                                <Input className="h-8" value={formData.consigneeDepartment} onChange={(e) => setFormData(prev => ({...prev, consigneeDepartment: e.target.value}))} disabled={isViewMode} />
                             </div>
                             <div>
                                <Label className="text-xs text-gray-500">User</Label>
                                <Input className="h-8" value={formData.consigneeUser} onChange={(e) => setFormData(prev => ({...prev, consigneeUser: e.target.value}))} disabled={isViewMode} />
                             </div>
                        </div>

                        <div>
                            <Label className="text-xs text-gray-500">Address</Label>
                            <Textarea value={formData.consigneeAddress} onChange={(e) => setFormData(prev => ({...prev, consigneeAddress: e.target.value}))} className="h-16 text-sm mb-2" placeholder="Address" disabled={isViewMode} />
                        </div>
                         <div className="grid grid-cols-1 gap-2 mb-2">
                            <Label className="text-xs text-gray-500">GSTIN</Label>
                            <Input className="h-8" placeholder="GSTIN" value={formData.consigneeGstin} onChange={(e) => setFormData(prev => ({...prev, consigneeGstin: e.target.value}))} disabled={isViewMode} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div><Label className="text-xs text-gray-500">State</Label><Input className="h-8" placeholder="State" value={formData.consigneeState} onChange={(e) => setFormData(prev => ({...prev, consigneeState: e.target.value}))} disabled={isViewMode} /></div>
                            <div><Label className="text-xs text-gray-500">State Code</Label><Input className="h-8" placeholder="State Code" value={formData.consigneeStateCode} onChange={(e) => setFormData(prev => ({...prev, consigneeStateCode: e.target.value}))} disabled={isViewMode} /></div>
                        </div>
                    </div>
                 </div>
            </div>
        </div>

        {/* PO Details */}
        <div className="mb-8 border p-4 rounded-md bg-gray-50/50">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                    <Label>Purchase Order No</Label>
                     <Select onValueChange={handlePOChange} value={formData.poId} disabled={!formData.customerId || isViewMode}>
                        <SelectTrigger disabled={!formData.customerId || isViewMode}>
                            <SelectValue placeholder={formData.customerId ? "Select PO" : "Select Customer First"} />
                        </SelectTrigger>
                        <SelectContent>
                            {customerPOs.map(po => (
                                <SelectItem key={po.id} value={po.id}>
                                    {po.order_receipt_id}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>PO Date</Label>
                    <Input 
                        type="date"
                        value={formData.poDate}
                        onChange={(e) => setFormData(prev => ({...prev, poDate: e.target.value}))}
                        disabled={!!formData.poId || isViewMode} 
                    />
                </div>
             </div>
        </div>

        {/* Products Section */}
        <div className="mb-8">
            <h3 className="font-semibold mb-2">Product Details</h3>
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-700 font-medium">
                        <tr>
                            <th className="p-3 w-12">SN</th>
                            <th className="p-3 w-48">Product Name</th>
                            <th className="p-3">Description of Goods</th>
                            <th className="p-3 w-32">HSN/SAC</th>
                            <th className="p-3 w-48">Quantity</th> 
                            <th className="p-3 w-32">Rate (₹)</th>
                            <th className="p-3 w-32">Amount (₹)</th>
                            {!isViewMode && <th className="p-3 w-12"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {items.map((item, index) => (
                            <tr key={item.id}>
                                <td className="p-3 text-center">{index + 1}</td>
                                
                                <td className="p-3">
                                    {isViewMode ? (
                                        <div className="text-gray-700 font-medium px-1">
                                            {item.productName || '-'} 
                                        </div>
                                    ) : (
                                        formData.poId && poItems.length > 0 ? (
                                             <Select 
                                                onValueChange={(val) => handlePOItemSelect(item.id, val)} 
                                                value={item.poItemId || item.productName || ''} 
                                                disabled={isViewMode}
                                            >
                                                <SelectTrigger disabled={isViewMode}>
                                                    <SelectValue>
                                                        {item.productName || 'Select Product'}
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[200px] overflow-y-auto">
                                                    {(!item.poItemId && item.productName) && (
                                                        <SelectItem value={item.productName} className="hidden">
                                                            {item.productName}
                                                        </SelectItem>
                                                    )}
                                                    {poItems.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            {p.product_name || p.description || 'Unknown Item'}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Select 
                                                onValueChange={(val) => handleProductSelect(item.id, val)} 
                                                value={item.productName || ''}
                                                disabled={isViewMode}
                                            >
                                                <SelectTrigger disabled={isViewMode}>
                                                    <SelectValue>
                                                        {item.productName || 'Select Product'}
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[200px] overflow-y-auto">
                                                    {products.map(p => (
                                                        <SelectItem key={p.id} value={p.product_name}>{p.product_name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )
                                    )}
                                </td>

                                <td className="p-3">
                                    <Input 
                                        value={item.description}
                                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                        placeholder="Description"
                                        className={formData.poId ? 'bg-gray-50' : ''}
                                        disabled={isViewMode}
                                    />
                                </td>

                                <td className="p-3">
                                    <Input 
                                        value={item.hsnCode}
                                        onChange={(e) => handleItemChange(item.id, 'hsnCode', e.target.value)}
                                        disabled={isViewMode}
                                    />
                                </td>
                                <td className="p-3">
                                    <Input 
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                        disabled={isViewMode}
                                        className={isViewMode ? "bg-gray-50 text-black opacity-100" : ""}
                                    />
                                    {!isViewMode && item.scheduleDeductions && item.scheduleDeductions.length > 0 && (
                                        <div className="text-[10px] text-green-600 mt-1 font-medium">
                                            Allocated across {item.scheduleDeductions.length} schedule(s)
                                        </div>
                                    )}
                                </td>
                                <td className="p-3">
                                    <Input 
                                        type="number"
                                        value={item.rate}
                                        onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                        className={formData.poId ? 'bg-gray-50' : ''}
                                        disabled={isViewMode}
                                    />
                                </td>
                                <td className="p-3 font-medium text-right bg-gray-50">
                                    {item.amount.toFixed(2)}
                                </td>
                                {!isViewMode && (
                                    <td className="p-3 text-center">
                                        <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 h-8 w-8">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                             <td colSpan="6" className="p-3 text-right">Total:</td>
                             <td className="p-3 text-right">{totals.subTotal.toFixed(2)}</td>
                             {!isViewMode && <td></td>}
                        </tr>
                    </tbody>
                    {!isViewMode && (
                        <tfoot>
                            <tr>
                                <td colSpan="8" className="p-2 bg-gray-50">
                                    <Button variant="outline" size="sm" onClick={addItem} className="gap-2 border-dashed border-gray-400 text-gray-600 hover:text-blue-600 hover:border-blue-600">
                                        <Plus className="h-4 w-4" /> Add Item
                                    </Button>
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>

        {/* Tax & Totals Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
                <div className="border p-4 rounded-md">
                    <h4 className="font-semibold mb-3">Tax Configuration</h4>
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                             <Checkbox 
                                id="tax-cgst" 
                                checked={formData.applyCgst}
                                onCheckedChange={(c) => handleTaxCheckboxChange('CGST', c)}
                                disabled={isViewMode}
                            />
                            <Label htmlFor="tax-cgst" className="flex-grow">CGST (9%)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                             <Checkbox 
                                id="tax-sgst" 
                                checked={formData.applySgst}
                                onCheckedChange={(c) => handleTaxCheckboxChange('SGST', c)}
                                disabled={isViewMode}
                            />
                            <Label htmlFor="tax-sgst" className="flex-grow">SGST (9%)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                             <Checkbox 
                                id="tax-igst" 
                                checked={formData.applyIgst}
                                onCheckedChange={(c) => handleTaxCheckboxChange('IGST', c)}
                                disabled={isViewMode}
                            />
                            <Label htmlFor="tax-igst" className="flex-grow">IGST (18%)</Label>
                        </div>
                    </div>
                </div>

                {/* Additional Charges Section */}
                <div className="border p-4 rounded-md">
                    <h4 className="font-semibold mb-3">Additional Charges</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Description</Label>
                            <Input 
                                placeholder="e.g., Freight, Packaging"
                                value={formData.otherChargesDescription}
                                onChange={(e) => setFormData(prev => ({...prev, otherChargesDescription: e.target.value}))}
                                disabled={isViewMode}
                            />
                        </div>
                        <div>
                            <Label>Percentage (%)</Label>
                            <Input 
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="e.g., 5"
                                value={formData.otherChargesPercentage}
                                onChange={(e) => setFormData(prev => ({...prev, otherChargesPercentage: e.target.value}))}
                                disabled={isViewMode}
                            />
                        </div>
                    </div>
                </div>

                <div className="border p-4 rounded-md bg-gray-50">
                    <h4 className="font-semibold mb-2">Total Amount Chargeable in Words</h4>
                    <p className="text-lg text-gray-700 italic">{totals.amountInWords}</p>
                </div>

                 <div className="border p-4 rounded-md bg-gray-50">
                    <h4 className="font-semibold mb-2 text-sm">Total Tax Amount in Words</h4>
                    <p className="text-sm text-gray-700 italic">{totals.taxAmountInWords}</p>
                </div>
                
                 <div className="border p-4 rounded-md">
                    <h4 className="font-semibold mb-2 text-sm">Declaration</h4>
                    <p className="text-xs text-gray-500">
                        We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                 <div className="border border-gray-300 rounded-lg overflow-hidden bg-white text-sm">
                    <div className="flex border-b border-gray-300">
                        <div className="w-[60%] p-3 border-r border-gray-300 bg-gray-50 text-gray-700 font-medium">Taxable Amount</div>
                        <div className="w-[40%] p-3 text-right">{totals.subTotal.toFixed(2)}</div>
                    </div>
                    
                    {formData.applyCgst && (
                        <div className="flex border-b border-gray-300">
                            <div className="w-[60%] p-3 border-r border-gray-300 text-gray-700">CGST (9%)</div>
                            <div className="w-[40%] p-3 text-right">{totals.cgst.toFixed(2)}</div>
                        </div>
                    )}
                    
                    {formData.applySgst && (
                        <div className="flex border-b border-gray-300">
                            <div className="w-[60%] p-3 border-r border-gray-300 text-gray-700">SGST (9%)</div>
                            <div className="w-[40%] p-3 text-right">{totals.sgst.toFixed(2)}</div>
                        </div>
                    )}

                    {formData.applyIgst && (
                        <div className="flex border-b border-gray-300">
                            <div className="w-[60%] p-3 border-r border-gray-300 text-gray-700">IGST (18%)</div>
                            <div className="w-[40%] p-3 text-right">{totals.igst.toFixed(2)}</div>
                        </div>
                    )}

                    {formData.otherChargesPercentage > 0 && (
                        <div className="flex border-b border-gray-300">
                            <div className="w-[60%] p-3 border-r border-gray-300 text-gray-700">
                                {formData.otherChargesDescription || 'Other Charges'} ({formData.otherChargesPercentage}%)
                            </div>
                            <div className="w-[40%] p-3 text-right">{totals.otherChargesAmount.toFixed(2)}</div>
                        </div>
                    )}
                    
                    <div className="flex border-t-2 border-gray-800 bg-gray-50/30">
                        <div className="w-[60%] p-3 border-r border-gray-300 font-bold text-lg text-gray-900">Grand Total</div>
                        <div className="w-[40%] p-3 text-right font-bold text-lg text-gray-900">{totals.grandTotal.toFixed(2)}</div>
                    </div>
                 </div>

                 <h4 className="font-semibold mb-2 mt-4 text-sm">Tax Details</h4>
                 <div className="border rounded text-xs overflow-x-auto">
                    <table className="w-full text-center">
                        <thead className="bg-gray-100 font-semibold border-b">
                           <tr>
                                <th className="p-2 border-r">HSN/SAC</th>
                                <th className="p-2 border-r">Taxable</th>
                                {formData.applyCgst && <th className="p-2 border-r">CGST</th>}
                                {formData.applySgst && <th className="p-2 border-r">SGST</th>}
                                {formData.applyIgst && <th className="p-2 border-r">IGST</th>}
                                <th className="p-2">Total Tax</th>
                           </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="p-2 border-r">{totals.uniqueHsn || '-'}</td>
                                <td className="p-2 border-r">{totals.subTotal.toFixed(2)}</td>
                                {formData.applyCgst && <td className="p-2 border-r">{totals.cgst.toFixed(2)}</td>}
                                {formData.applySgst && <td className="p-2 border-r">{totals.sgst.toFixed(2)}</td>}
                                {formData.applyIgst && <td className="p-2 border-r">{totals.igst.toFixed(2)}</td>}
                                <td className="p-2">{totals.totalTaxAmount.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                 </div>

                 <div className="border p-4 rounded-md flex flex-col items-end justify-between min-h-[120px] bg-white mt-8">
                    <p className="font-bold text-gray-800 text-right text-sm">
                        for {selectedCompany.name}
                    </p>
                    <p className="font-semibold text-gray-700 mt-10 text-right text-sm">
                        Authorised Signatory
                    </p>
                 </div>
            </div>
        </div>

      </div>

      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
          <DialogContent className="max-w-[800px] w-full max-h-[90vh] overflow-y-auto">
              <AddClientForm onClientAdded={handleClientAdded} />
          </DialogContent>
      </Dialog>
      
      <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
          <DialogContent className="max-w-[800px] w-full max-h-[90vh] overflow-y-auto">
              <EditClientForm clientId={editingClientId} clients={clients} onClientUpdated={handleClientUpdated} />
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateInvoiceForm;