import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Save, Ban, Trash2, FileText, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import useItemManagement from '@/hooks/useItemManagement';
import DatePicker from '@/components/DatePicker';
import { numberToWords } from '@/lib/numberToWords';

const initialItemState = {
  item_id: '',
  item_category: '',
  item_name: '',
  unit: '',
  available_quantity: '',
  quantity: '',
  rate: '',
  amount: '',
};

const ManufacturingForm = ({ setView }) => {
  const { toast } = useToast();
  const { items, checkItemStock, fetchItems } = useItemManagement();

  const [manufacturingNumber, setManufacturingNumber] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState(new Date());
  
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  
  const [currentItem, setCurrentItem] = useState(initialItemState);
  const [addedItems, setAddedItems] = useState([]);
  const [itemNames, setItemNames] = useState([]);

  const [labourExpenses, setLabourExpenses] = useState({
    fitter: { checked: false, manHours: '', cost: '', totalCost: '' },
    welder: { checked: false, manHours: '', cost: '', totalCost: '' },
    helper: { checked: false, manHours: '', cost: '', totalCost: '' },
    hydraulic: { checked: false, manHours: '', cost: '', totalCost: '' },
  });

  const [formTaxes, setFormTaxes] = useState({ cgst: false, sgst: false, igst: false });
  const [taxableAmount, setTaxableAmount] = useState('');
  const [sellingPriceInWords, setSellingPriceInWords] = useState('');

  const categories = ["BRM", "HCU", "CU", "PNT", "PPE", "EPI", "LBR"];
  const itemData = {
    BRM: ["MS TUBE 80X40X2.5MM", "MS Tube 72X72X1.5mm", "Ms Tube 30X30X1.5 mm", "ms tube 40X40X1.6 mm", "MS Tube 40X40 -2.5mm", "MS Tube 50X50 -1.5mm", "MS Tube 20X20X1.5mm", "MS Tube 50X50 -2mm", "MS Tube 80X40 -1.5mm", "MS Channel -75X40mm", "MS Channel -70X35mm", "Ms pipe 25 Nb", "MS pipe 15 Nb", "ms pipe 50 Nb A class", "ms pipe 40 NB A class", "ss pipe 304-300 NB (2.225", "SS Pipe 200 NB (L-6110 mm )", "SS Bend Flange304-100 NB", "Ms Angle 50X5-2350mm", "Channel With Base plate 125X65-(2500X2=5000)", "Ms Channel WITH Base Plate 125X65-1600mm", "Ms pipe 150 NB A class", "Ms pipe 65 NB A class", "MS Angle 25X5", "MS Angle 40x -5mm", "MS Angle 50x -5mm", "MS Angle 75x -6mm", "MS Flat 30X3 mm", "MS Flat 25x -5mm", "MS Flat 40x -5mm", "MS Flat 50x -5mm", "MS Flat 75X6", "MS Plate 90X200 -16mm -With 18mm 2 Drill Hole/Plate", "MS Plate 200X200 -16mm -With 14mm 4 Drill Hole/Plate", "MS Rib -8mm Thk - 263x478/490H -With Slot", "MS Plate 50X50X1.5 mm", "MS Plate 145X90X10 mm", "MS Block -50x50 -150mm Long (with Drill Hole)", "MS Plate 300X300 -16mm", "MS Plate 500X500 -16mm", "MS Plate 100x100 -6mm", "MS Plate 120X90 -10mm", "MS Plate 150X110-10mm Thk", "MS Sheet 930x745 -2.0mm", "MS Sheet 600X400X4 mm", "ms sheet 1800X200X2 mm", "ms sheet 1040X200X2 mm", "ms sheet 600X200X2 mm", "ms sheet 620X600X2 mm", "ms sheet 1800X600X2 mm", "ms sheet 1800X620X2 mm", "MS Sheet 625X315X 2 mm", "MS Sheet 1000x1000 -2.0mm", "ms sheet 350X610X1.6 mm", "ms sheet 340X410X1.6 mm", "MS Sheet 1370X1140 -2.0mm", "MS Sheet 1250x2500 -3mm Thk", "MS Sheet 1200X1200-2.5mm THK", "MS Sheet 1140x670mm -2.0mm", "MS Sheet 4'x6' -1.5mm", "MS Sheet 850x620mm -2.0mm", "MS sheet 1200X2500X2mm", "Ms sheet 310X610X2 mm", "Ms sheet 2400X1200X2 mm", "ms sheet 1140X670X2mm", "ms sheet 1140X220X2mm", "ms sheet 25.6XMTRX1100mmX2 mm", "GI Sheet 8'X4'-2 mm", "MS Chequered Plate 8'X4'X3 mm", "ms chequered plate 2015X1055X3 mm", "ms chequered plate 2205X1180X3 mm", "ms chequered plate 330X1000X 3 mm", "MS Chequered plate 1360X1360X5 mm", "MS Round Bar -8mm", "MS Round Bar -10mm", "MS Round Bar -20mm", "MS I Beam ISMB 150", "SS 304 2\"x-18SWG - Matfinish", "SS 304 1-1/2\"x-18SWG - Matfinish", "SS 304 5/8\"x-18SWG - Matfinish", "SS Washer OD 100 x Id 85mm -4mm Thk", "SS pipe304 60 OD ,55 ID ( 3MTR )", "SS Pipe 304 65 NB", "SS elbow 304 66 Od", "SS sheet 2 mm ( 810X1500)", "MS Pipe Tube 25X25X2 mm", "ss Sheet 304 Flat 100X5(500MM long )", "MS Pipe 1/2\" B Class", "Al. Chq. Plate 4'x8' -4mm", "MS Chq. Plate 1230x2640 -3mm Thk", "MS Chq. Plate 2200x900X3 mmThk", "MS Chq. Plate 900x280 -3mm -Sq Mtrs", "MS Chq. Plate 2110x1000-3mm -Sq Mtrs", "MS Chq. Plate 1200x900-3mm -Sq Mtrs", "MS Chq. Plate 800x700 -3mm -Sq Mtrs", "MS Chq. Plate 1450x2000 -3mm -Sq Mtrs", "Wiremesh -1\"x1\" -2mm Thk - 5'Bundle kg", "Wiremesh -1\"x1\" -2mm Thk - 1000x700", "Wiremesh -1\"x1\" -2mm Thk - 800x440", "Copper Wire 4mm Thk"],
    HCU: ["HT Bolt 12x -100mm", "HT Bolt 14x -100mm", "HT Bolt 16x -150mm", "HT Bolt -16x -100", "HT Bolt 16x -125mm", "HT Nut M 12", "HT Nut M 16", "HT Ny Lock Nut M 14", "HT Ny Lock Nut M 16", "HT Bolt 16x -300mm", "HT Bolt 16x -50mm", "HT Stud M16x1000mm", "HT Stud M20x1000mm", "HT Washers 16mm", "Helicoil T Handle Tap Wrench (4 Types)", "Allen Bolt 6mmx15mm (3/4\"x 1/2\")", "SS Bolt -20x100mm", "SS Nut M20", "SS Washer M20", "Lock Nut M16", "Stud 16x600", "loctite 406 20 gm", "HP Screw 1\"", "HP Screw 1-1/2\"", "HP Screw 2\"", "MS Hex Bolt M12", "Nylock Nut M10", "Nylock Nut M 12", "hex bolt 4X50mm", "Nylock Nut M 8", "MS Hex Nut Bolt 8x 150", "MS Hex Nut Bolt Washer M 10x -15mm", "PLUGE RAILLY 24 VOLT", "MS Hex Nut Bolt 10x -50mm", "MS Hex Nut & Bolt 12x -50mm", "MS Hex Bolt 6x -50mm", "Ms Hex Nut M30", "TVS MS Hex Bolt 10x -100mm", "Hrx Nut bolt m12X150", "Hex bolt m12X100", "I BOLT 8 MM", "GI Hex Nipple /Reducer 3\"x2\"", "HT Nut M8", "HT Nut M10", "HT Nut M20", "HEX NUT M, 12", "Hex Bolt 10X15 mm", "MS Washers 30mm", "CSK Bolt 6x 25mm", "HT Bolt 12x -40mm"],
    CU: ["Cutting Wheel 4\"", "Cutting Wheel 7\"", "Cutt Off Wheel 14\"", "Grinding Wheel 4\"", "Cut Off Wheel 7\"", "Cut Off Wheel 14\"", "Buffing Wheel 4\"", "Grinder Carbon Brush 4\"", "Grinder Carbon Brush 7\"", "Gasket -OD 250 xID 200 (Refractory)", "Gasket 1\"", "Gasket 3/4\"", "Gasket 1 -1/2\"", "Gasket 150 MB", "Gasket 100 MB", "Gasket 65 MB", "Gasket 2\"", "Gasket ring 10\"", "Gasket 5\"", "UPVC Tank Nipple 1\"", "UPVC Tank Nipple 1/2\"", "UPVC 3\" Pipe -Mtr", "UPVC Ball Valve 2\"", "UPVC Ball Valve 1\"", "UPVC Elbow 3\"", "UPVC Elbow 1\"", "UPVC Union 3/4\"", "UPVC Union 1\"", "UPVC Reduser 75X90mm", "UPVC 3/4\" x 1\" Reducer", "UPVC 1\" x 1-1/2\" Reducer", "UPVC FTA 1-1/2\"", "UPVC Socket 2\"", "UPVC Female Socket 1\"", "UPVC Female Socket 2\"", "PVC Pipe 3\" -Mtr", "PVC Solution 100ml", "safety Belt", "Paint Brush 1\"", "Paint Brush 2\"", "Paint Brush 3\"", "Paint Roller 4\"", "Roller for Clouring 2\"", "Roller for Clouring 4\"", "cable 3 core 2 mm", "Arting Clamp", "Welding Holder", "welding cable", "Welding Rod 3.15 Packet", "Custing Welding Rod 3.15", "SS Elbow 90mm", "Welding Rod MS To SS", "Welding Rod SS 2.15", "Welding Rod SS 3.15 Packet", "SS Hand Droup Set 10\"", "Self Tapping Screw 10x -32mm - Box", "Self Tapping Screw 10x -38mm - Box", "Self Tapping Screw 10x -50mm - Box", "Fire Blanket 2 Mtr x 2 Mtr", "Self Tapping screw M6X25", "1.5 mm metal wire gland", "PG 13 PVC GLAND", "CABLE TAYE", "Blower Carben brush", "FLOOT SWITCH", "PRERSSURE SWICH", "BAREDED HOSE PIPE 40 NB", "STAR BIT", "grander nut 4\"", "singal core 2.5 mm cable green", "230/24 VOLTS SMPS 5 AMP", "BALCK TAPE", "Hex Nipple 2\"", "Hydraulic Fitting 1/2\"", "teplon tape", "SS Filler Wire", "Glass -Welding -Black", "Glass -Welding -White", "safety google", "M- Seal 100 Gm,", "Dure leg Guard", "Polish Paper 180 No", "Measuring Tape 5 Mtrs", "Welding Earthing Holder (Clamp)", "Plazma Cutting Nozzel -1.5mm", "Plazma Machine Shield Cap", "Hand Hack Saw Blade", "M tape 3 MTR", "M tape 5 MTR", "Lock & Key -50mm", "3 Plug Pin Top", "Pin Top 250 W", "Cable 3 Core", "Full Scale Note Book 100 Pages", "Full Scale Note Book 200 Pages", "Muster Book", "Check Sheet Book", "Stickers 200X50 mm", "OK/Not OK Stickers", "Printing A4 Paper RIM", "Barrication Tape", "Face shiled", "MS Hinges 4\"", "Box File", "HRC Fuse 36 amp", "RCCB", "MCB -30 amp", "sticker green 200X100mm", "Ared Tag 200X100mm", "Feviquick -20 Ml", "Rubber Bidding -in Mtr", "scrap material tage", "material rack tag", "banner 3'X2'", "wire bolt", "Tool & Tackle set", "HDPE cupler 63 mm.", "HDPE Elbow 63", "4\" parliament Hinges", "chain(Ft)", "carban brush 4\" grander", "ms Hand Droup set 8\"", "wire rope 6 mm", "U clamp", "EVE bolt M 8 c"],
    PNT: ["Thinner Ltrs", "Colour RAL 1003 -Ltrs", "Colour RAL 6018 -Ltrs", "Colour RAL 9002 -Ltrs", "Colour Golden Yellow -Ltrs", "Ral 9002 paint", "Colour Black Ltrs", "Colour White Ltr", "Colour Sky Blue Ltrs", "Colour Silver Ltrs", "Colour Red Oxide", "Colour Red", "Colour Brown", "Colour Gray", "Colour Deep Orange", "Auto Paint -Black", "Auto Paint -Yellow", "Turpentine"],
    PPE: ["leather leg sleeve", "leather hand sleeve", "welding apron full body", "welding Apron", "Cotton Handgloves", "Rubber Handgloves", "Welding Face Shield", "Welding Hand Gloves", "Safety Shoes", "supervisor T shirt", "Shirt", "T Shirt", "Safety jacket"],
    EPI: ["Stripping Roll", "Stripping Clamps (200 Nos/2 Kg) -in Kgs"],
    LBR: ["Galvanizing", "Powder Coating", "Plating", "Laser Cutting", "Machining"],
  };
  const labourCategories = [
    { id: 'fitter', label: 'Fitter' },
    { id: 'welder', label: 'Welder' },
    { id: 'helper', label: 'Helper (Cutting, Grinding)' },
    { id: 'hydraulic', label: 'Hydraulic / Mechanical Press Labour' },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCustomers = useCallback(async () => {
    const { data: customersData, error: customersError } = await supabase.from('customers').select('id, customer_name, department1, department_name_1, user1');
    if (customersError) toast({ title: 'Error fetching customers', description: customersError.message, variant: 'destructive' });
    else {
      setCustomers(customersData || []);
      setFilteredCustomers(customersData || []);
    }
  }, [toast]);

  const fetchInitialData = useCallback(async () => {
    fetchCustomers();
    const { data, error } = await supabase.from('manufacturing').select('manufacturing_number').order('created_at', { ascending: false }).limit(1);
    if (error) {
      console.error('Error fetching last manufacturing number:', error);
      setManufacturingNumber('MFG-001');
    } else {
      const lastId = data[0]?.manufacturing_number;
      const newId = lastId ? `MFG-${String(parseInt(lastId.split('-')[1]) + 1).padStart(3, '0')}` : 'MFG-001';
      setManufacturingNumber(newId);
    }
  }, [fetchCustomers]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!customerSearchTerm) {
      setFilteredCustomers(customers);
    } else {
      setFilteredCustomers(customers.filter(c => 
        c.customer_name.toLowerCase().includes(customerSearchTerm.toLowerCase())
      ));
    }
  }, [customerSearchTerm, customers]);

  const handleCustomerChange = async (customer) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomer(customer);
    setCustomerSearchTerm(customer.customer_name);
    setIsCustomerDropdownOpen(false);

    const { data: poData, error: poError } = await supabase.from('purchase_order_receipts').select('id, order_receipt_id').eq('customer_id', customer.id);
    if (poError) toast({ title: 'Error fetching POs', description: poError.message, variant: 'destructive' });
    else setPurchaseOrders(poData);

    const { data: woData, error: woError } = await supabase.from('work_orders').select('id, work_order_number').eq('customer_id', customer.id);
    if (woError) toast({ title: 'Error fetching Work Orders', description: woError.message, variant: 'destructive' });
    else setWorkOrders(woData);
  };
  
  const handleItemInputChange = (e) => {
    const { id, value } = e.target;
    setCurrentItem((prev) => ({ ...prev, [id]: value }));
  };

  const handleItemSelectChange = async (id, value) => {
    setCurrentItem((prev) => ({ ...prev, [id]: value }));
    if (id === 'item_category') {
      setItemNames(itemData[value] || []);
      setCurrentItem((prev) => ({ ...prev, item_name: '', unit: '', rate: '', available_quantity: '' }));
    }
    if (id === 'item_name') {
        const selectedItem = items.find(i => i.item_name === value);
        if(selectedItem) {
            const stock = await checkItemStock(value, selectedItem.unit);
            setCurrentItem(prev => ({
                ...prev, 
                item_id: selectedItem.id, 
                unit: selectedItem.unit || '',
                rate: stock?.latestPrice || selectedItem.price || '',
                available_quantity: stock?.totalQuantity || 0
            }));
        }
    }
  };

  const handleLabourCheckboxChange = (id, checked) => {
    setLabourExpenses(prev => ({
      ...prev,
      [id]: { ...prev[id], checked }
    }));
  };

  const handleLabourInputChange = (id, field, value) => {
    setLabourExpenses(prev => {
      const newLabourExpenses = { ...prev };
      newLabourExpenses[id][field] = value;
      
      const manHours = parseFloat(newLabourExpenses[id].manHours) || 0;
      const cost = parseFloat(newLabourExpenses[id].cost) || 0;
      newLabourExpenses[id].totalCost = (manHours * cost).toFixed(2);

      return newLabourExpenses;
    });
  };

  const addUsedItem = () => {
    if (!currentItem.item_category || !currentItem.item_name || !currentItem.quantity || !currentItem.rate) {
      toast({ title: 'Incomplete Item', description: 'Please fill all item details before adding.', variant: 'destructive' });
      return;
    }
     const usedQty = parseFloat(currentItem.quantity);
    const availableQty = parseFloat(currentItem.available_quantity);
    if (usedQty > availableQty) {
      toast({ title: 'Insufficient Stock', description: `Cannot use ${usedQty}. Only ${availableQty} available.`, variant: 'destructive' });
      return;
    }
    const itemToAdd = { ...currentItem };
    setAddedItems(prev => [...prev, itemToAdd]);
    setCurrentItem(initialItemState);
    setItemNames([]); 
  };
  
  const removeUsedItem = (index) => setAddedItems(addedItems.filter((_, i) => i !== index));

  useEffect(() => {
    const { quantity, rate } = currentItem;
    const newAmount = (parseFloat(quantity) || 0) * (parseFloat(rate) || 0);
    setCurrentItem(prev => ({ ...prev, amount: Math.round(newAmount).toString() }));
  }, [currentItem.quantity, currentItem.rate]);

  const costOfPiUtilized = useMemo(() => addedItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0), [addedItems]);
  
  const totalManHours = useMemo(() => {
    return Object.values(labourExpenses).reduce((sum, exp) => sum + (exp.checked ? parseFloat(exp.manHours) || 0 : 0), 0)
  }, [labourExpenses])

  const labourCost = useMemo(() => {
     return Object.values(labourExpenses).reduce((sum, exp) => sum + (exp.checked ? parseFloat(exp.totalCost) || 0 : 0), 0)
  }, [labourExpenses]);

  const basicPrice = useMemo(() => costOfPiUtilized + labourCost, [costOfPiUtilized, labourCost]);
  const overheadExpenses = useMemo(() => basicPrice * 0.10, [basicPrice]);
  const profit = useMemo(() => basicPrice * 0.10, [basicPrice]);
  const sellingPrice = useMemo(() => basicPrice + overheadExpenses + profit, [basicPrice, overheadExpenses, profit]);

  useEffect(() => {
    if (sellingPrice) {
      setSellingPriceInWords(numberToWords(Math.round(sellingPrice)));
    } else {
      setSellingPriceInWords('');
    }
  }, [sellingPrice]);

  const handleSave = async () => {
    const manufacturingData = {
      manufacturing_number: manufacturingNumber,
      manufacturing_date: manufacturingDate.toISOString().split('T')[0],
      customer_id: selectedCustomerId,
      purchase_order_receipt_id: document.getElementById('poNumber')?.value || null,
      work_order_id: document.getElementById('workOrderNumber')?.value || null,
      used_items: addedItems,
      labour_expenses: labourExpenses,
      cost_of_pi_utilized: costOfPiUtilized,
      labour_cost: labourCost,
      basic_price: basicPrice,
      overhead_expenses: overheadExpenses,
      profit: profit,
      selling_price: sellingPrice,
      taxable_amount: parseFloat(taxableAmount) || 0,
      taxes: formTaxes,
      selling_price_in_words: sellingPriceInWords
    };

    const { data: mfgRecord, error: mfgError } = await supabase.from('manufacturing').insert([manufacturingData]).select().single();

    if (mfgError) {
      toast({ title: 'Error saving manufacturing details', description: mfgError.message, variant: 'destructive' });
      return;
    }
    
    for (const usedItem of addedItems) {
      let quantityToDeduct = parseFloat(usedItem.quantity);

      const { data: stockEntries, error: stockError } = await supabase
        .from('items')
        .select('id, quantity, used_quantity')
        .eq('item_name', usedItem.item_name)
        .eq('unit', usedItem.unit)
        .order('invoice_date', { ascending: true });

      if (stockError) {
        toast({ title: `Error fetching stock for ${usedItem.item_name}`, description: stockError.message, variant: 'destructive' });
        continue;
      }
      
      for (const entry of stockEntries) {
        if (quantityToDeduct <= 0) break;

        const initialQuantity = parseFloat(entry.quantity) || 0;
        const usedQuantity = parseFloat(entry.used_quantity) || 0;
        const availableInEntry = initialQuantity - usedQuantity;

        if (availableInEntry > 0) {
          const deductFromThisEntry = Math.min(quantityToDeduct, availableInEntry);
          const newUsedQuantity = usedQuantity + deductFromThisEntry;

          const { error: updateError } = await supabase
            .from('items')
            .update({ used_quantity: newUsedQuantity })
            .eq('id', entry.id);

          if (updateError) {
            toast({ title: `Error updating stock for ${usedItem.item_name}`, description: updateError.message, variant: 'destructive' });
          }
          
          quantityToDeduct -= deductFromThisEntry;
        }
      }
    }

    toast({ title: 'Success!', description: 'Manufacturing details saved and stock updated.' });
    await fetchItems();
    if (setView) setView('dashboard');
  };

  const handleSaveAsPDF = () => {
    toast({
      title: "PDF Export",
      description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀"
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Add New Manufacturing Details</h2>
        <Button 
          type="button" 
          onClick={() => setView && setView('dashboard')} 
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>

      <Card className="max-w-7xl mx-auto">
        <CardContent className="pt-6">
          <form className="space-y-8">
            {/* Top Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <Label>Manufacturing Details Number</Label>
                <Input value={manufacturingNumber} readOnly className="bg-gray-100" />
              </div>
              
              <div className="flex flex-col space-y-2">
                <Label>Manufacturing Details Date</Label>
                <DatePicker date={manufacturingDate} setDate={setManufacturingDate} dateFormat="dd-MM-yyyy" />
              </div>
              
              <div className="space-y-2 relative" ref={dropdownRef}>
                <Label>Customer Name</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-grow">
                    <Input 
                      value={customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        setIsCustomerDropdownOpen(true);
                        if (!e.target.value) {
                          setSelectedCustomerId('');
                          setSelectedCustomer(null);
                        }
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      placeholder="Search Customer..."
                      className="w-full"
                    />
                    {isCustomerDropdownOpen && filteredCustomers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredCustomers.map(c => (
                          <div 
                            key={c.id} 
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => handleCustomerChange(c)}
                          >
                            {c.customer_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label>Department Name</Label>
                <Input 
                  value={selectedCustomer?.department_name_1 || selectedCustomer?.department1 || ''} 
                  readOnly 
                  disabled 
                  className="bg-gray-100 disabled:opacity-75" 
                />
              </div>
              
              <div>
                <Label>User Name</Label>
                <Input 
                  value={selectedCustomer?.user1 || ''} 
                  readOnly 
                  disabled 
                  className="bg-gray-100 disabled:opacity-75" 
                />
              </div>

              <div>
                <Label>PO from Customer No</Label>
                <Select id="poNumber"><SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
                  <SelectContent>{purchaseOrders.map(po => <SelectItem key={po.id} value={po.id}>{po.order_receipt_id}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Work Order Number</Label>
                <Select id="workOrderNumber"><SelectTrigger><SelectValue placeholder="Select Work Order" /></SelectTrigger>
                  <SelectContent>{workOrders.map(wo => <SelectItem key={wo.id} value={wo.id}>{wo.work_order_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Used Item Details */}
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-700">Used Item Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
                  <div className="space-y-2"><Label>Category</Label><Select value={currentItem.item_category} onValueChange={(v) => handleItemSelectChange('item_category', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2 col-span-1 xl:col-span-2"><Label>Item Name</Label><Select value={currentItem.item_name} onValueChange={(v) => handleItemSelectChange('item_name', v)} disabled={!currentItem.item_category}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{itemNames.map((c, index) => <SelectItem key={`${c}-${index}`} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Unit</Label><Input value={currentItem.unit} readOnly className="bg-gray-100" /></div>
                  <div className="space-y-2"><Label>Available Qty</Label><Input value={currentItem.available_quantity} readOnly className="bg-gray-100" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 items-end mt-4">
                  <div className="space-y-2"><Label>Used Qty</Label><Input type="number" id="quantity" value={currentItem.quantity} onChange={handleItemInputChange} /></div>
                  <div className="space-y-2"><Label>Price of one</Label><Input type="number" id="rate" value={currentItem.rate} readOnly className="bg-gray-100" /></div>
                  <div className="space-y-2"><Label>Total Price</Label><Input type="number" id="amount" value={currentItem.amount} readOnly className="bg-gray-100" /></div>
                  <Button type="button" onClick={addUsedItem} className="w-full md:w-auto"><Plus className="mr-2 h-4 w-4" />Add</Button>
                </div>
                {addedItems.length > 0 && (
                  <Table className="mt-4">
                    <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Item Name</TableHead><TableHead>Used Qty</TableHead><TableHead>Price</TableHead><TableHead>Total Price</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {addedItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.item_category}</TableCell>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.rate}</TableCell>
                          <TableCell>{item.amount}</TableCell>
                          <TableCell><Button variant="destructive" size="icon" onClick={() => removeUsedItem(index)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter><TableRow><TableCell colSpan={4} className="text-right font-bold">Grand Total</TableCell><TableCell className="font-bold">{Math.round(costOfPiUtilized)}</TableCell><TableCell></TableCell></TableRow></TableFooter>
                  </Table>
                )}
            </div>

            {/* Labour Expenses */}
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-700">Labour Expenses</h3>
              <div className="space-y-4">
                  {labourCategories.map(({ id, label }) => (
                    <div key={id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      <div className="flex items-center space-x-2"><Checkbox id={id} checked={labourExpenses[id].checked} onCheckedChange={(c) => handleLabourCheckboxChange(id, c)} /><Label htmlFor={id} className="font-medium">{label}</Label></div>
                      <div className="space-y-2"><Label>Man Hours</Label><Input type="number" value={labourExpenses[id].manHours} onChange={(e) => handleLabourInputChange(id, 'manHours', e.target.value)} disabled={!labourExpenses[id].checked} /></div>
                      <div className="space-y-2"><Label>Cost of One Hour</Label><Input type="number" value={labourExpenses[id].cost} onChange={(e) => handleLabourInputChange(id, 'cost', e.target.value)} disabled={!labourExpenses[id].checked} /></div>
                      <div className="space-y-2"><Label>Total Cost of Man Hours</Label><Input type="number" value={labourExpenses[id].totalCost} readOnly className="bg-gray-100" /></div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2"><Label>Total Man Hours</Label><Input value={totalManHours.toFixed(2)} readOnly className="bg-gray-100" /></div>
                  <div className="space-y-2"><Label>Total Cost of Man Hours</Label><Input value={labourCost.toFixed(2)} readOnly className="bg-gray-100" /></div>
                </div>
            </div>

            {/* Final Costs */}
            <div className="border-t pt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
              <div><Label>Cost of PI Utilized</Label><Input value={costOfPiUtilized.toFixed(2)} readOnly className="bg-gray-100 font-bold" /></div>
              <div><Label>Labour Cost</Label><Input value={labourCost.toFixed(2)} readOnly className="bg-gray-100 font-bold" /></div>
              <div><Label>Basic Price</Label><Input value={basicPrice.toFixed(2)} readOnly className="bg-gray-100 font-bold" /></div>
              <div><Label>Overhead Expenses 10%</Label><Input value={overheadExpenses.toFixed(0)} readOnly className="bg-gray-100" /></div>
              <div><Label>Profit 10%</Label><Input value={profit.toFixed(0)} readOnly className="bg-gray-100" /></div>
              
              <div className="flex flex-col justify-end pb-2 space-y-3">
                <Label>Taxes</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="tax_cgst" checked={formTaxes.cgst} onCheckedChange={(c) => setFormTaxes(p => ({ ...p, cgst: c }))} />
                    <Label htmlFor="tax_cgst">CGST (9%)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="tax_sgst" checked={formTaxes.sgst} onCheckedChange={(c) => setFormTaxes(p => ({ ...p, sgst: c }))} />
                    <Label htmlFor="tax_sgst">SGST (9%)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="tax_igst" checked={formTaxes.igst} onCheckedChange={(c) => setFormTaxes(p => ({ ...p, igst: c }))} />
                    <Label htmlFor="tax_igst">IGST (18%)</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label>Taxable Amount</Label>
                <Input 
                  type="number" 
                  value={taxableAmount} 
                  onChange={(e) => setTaxableAmount(e.target.value)} 
                  placeholder="Enter Taxable Amount" 
                  readOnly
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div className="lg:col-span-1">
                <Label className="text-lg font-semibold">Selling Price</Label>
                <Input value={sellingPrice.toFixed(0)} readOnly className="bg-gray-100 text-lg font-bold" />
              </div>
              
              <div className="lg:col-span-3">
                <Label>Selling Price in Words</Label>
                <Input 
                  type="text" 
                  value={sellingPriceInWords} 
                  placeholder="e.g., One Hundred and Twenty Rupees Only" 
                  readOnly
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-end pt-8 border-t">
              <Button 
                type="button" 
                onClick={handleSaveAsPDF} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="mr-2 h-4 w-4" /> Save as PDF
              </Button>
              <Button 
                type="button" 
                onClick={handleSave} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
              <Button 
                type="button" 
                onClick={() => setView && setView('dashboard')} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Ban className="mr-2 h-4 w-4" /> Close
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ManufacturingForm;