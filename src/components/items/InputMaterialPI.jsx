import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
    import AddPIForm from '@/components/items/AddPIForm';
    import EditPIForm from '@/components/items/EditPIForm';
    import CheckStockForm from '@/components/items/CheckStockForm';
    import useItemManagement from '@/hooks/useItemManagement';
    import { Trash2, FilePlus, HelpCircle as CircleHelp, FileSearch, UserCheck as UserSearch, Pencil } from 'lucide-react';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { format } from 'date-fns';

    const InputMaterialPI = () => {
      const [isAddFormOpen, setIsAddFormOpen] = useState(false);
      const [isEditFormOpen, setIsEditFormOpen] = useState(false);
      const [editingItem, setEditingItem] = useState(null);
      const [isCheckStockOpen, setIsCheckStockOpen] = useState(false);
      const [isInvoiceSearchOpen, setIsInvoiceSearchOpen] = useState(false);
      const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);
      const [invoiceSearchTermInput, setInvoiceSearchTermInput] = useState('');
      const [supplierSearchTermInput, setSupplierSearchTermInput] = useState('');
      
      const [supplierSuggestions, setSupplierSuggestions] = useState([]);
      const [invoiceSuggestions, setInvoiceSuggestions] = useState([]);

      const { 
        filteredItems, 
        setSearchTerm, 
        deleteItem, 
        items, 
        searchByInvoice, 
        searchBySupplier,
        invoiceSearchTerm,
        supplierSearchTerm,
        fetchItems,
      } = useItemManagement();

      useEffect(() => {
        if (supplierSearchTermInput) {
          const uniqueSuppliers = [...new Set(items
            .map(item => item.supplier_name)
            .filter(name => name && name.toLowerCase().includes(supplierSearchTermInput.toLowerCase()))
          )];
          setSupplierSuggestions(uniqueSuppliers);
        } else {
          setSupplierSuggestions([]);
        }
      }, [supplierSearchTermInput, items]);

      useEffect(() => {
        if (invoiceSearchTermInput) {
          const uniqueInvoices = [...new Set(items
            .map(item => item.supplier_invoice_number)
            .filter(num => num && num.toLowerCase().includes(invoiceSearchTermInput.toLowerCase()))
          )];
          setInvoiceSuggestions(uniqueInvoices);
        } else {
          setInvoiceSuggestions([]);
        }
      }, [invoiceSearchTermInput, items]);

      const handleInvoiceSearch = () => {
        searchByInvoice(invoiceSearchTermInput);
        setIsInvoiceSearchOpen(false);
        setInvoiceSuggestions([]);
      };

      const handleSupplierSearch = () => {
        searchBySupplier(supplierSearchTermInput);
        setIsSupplierSearchOpen(false);
        setSupplierSuggestions([]);
      };
      
      const clearSearch = () => {
        setSearchTerm('');
        setInvoiceSearchTermInput('');
        setSupplierSearchTermInput('');
        searchByInvoice(''); 
        searchBySupplier('');
      };

      const handleSuggestionClick = (setter, value, searchFn) => {
        setter(value);
        searchFn(value);
        setIsSupplierSearchOpen(false);
        setIsInvoiceSearchOpen(false);
        setSupplierSuggestions([]);
        setInvoiceSuggestions([]);
      };

      const handleEditClick = (item) => {
        setEditingItem(item);
        setIsEditFormOpen(true);
      };

      const handleFormClose = () => {
        setIsAddFormOpen(false);
        setIsEditFormOpen(false);
        fetchItems();
      };

      const hasActiveSearch = invoiceSearchTerm || supplierSearchTerm;

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="p-4 md:p-6"
        >
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <CardTitle>Store Items - Stock Management</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Dialog open={isCheckStockOpen} onOpenChange={setIsCheckStockOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><CircleHelp className="mr-2 h-4 w-4" />Check Stock</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <CheckStockForm onClose={() => setIsCheckStockOpen(false)} />
                  </DialogContent>
                </Dialog>
                <Dialog open={isSupplierSearchOpen} onOpenChange={(isOpen) => { setIsSupplierSearchOpen(isOpen); if (!isOpen) setSupplierSuggestions([]); }}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><UserSearch className="mr-2 h-4 w-4" />Search by Supplier</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <CardHeader>
                      <CardTitle>Search by Supplier Name</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 relative">
                        <Label htmlFor="supplier-search">Supplier Name</Label>
                        <Input
                          id="supplier-search"
                          placeholder="Enter supplier name..."
                          value={supplierSearchTermInput}
                          onChange={(e) => setSupplierSearchTermInput(e.target.value)}
                          autoComplete="off"
                        />
                        {supplierSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full bg-background border rounded-md mt-1 max-h-40 overflow-y-auto">
                            {supplierSuggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="p-2 hover:bg-accent cursor-pointer"
                                onClick={() => handleSuggestionClick(setSupplierSearchTermInput, suggestion, searchBySupplier)}
                              >
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button onClick={handleSupplierSearch} className="w-full">Search</Button>
                    </CardContent>
                  </DialogContent>
                </Dialog>
                <Dialog open={isInvoiceSearchOpen} onOpenChange={(isOpen) => { setIsInvoiceSearchOpen(isOpen); if (!isOpen) setInvoiceSuggestions([]); }}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><FileSearch className="mr-2 h-4 w-4" />Search by Invoice</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <CardHeader>
                      <CardTitle>Search by Invoice Number</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 relative">
                        <Label htmlFor="invoice-search">Invoice Number</Label>
                        <Input
                          id="invoice-search"
                          placeholder="Enter invoice number..."
                          value={invoiceSearchTermInput}
                          onChange={(e) => setInvoiceSearchTermInput(e.target.value)}
                          autoComplete="off"
                        />
                        {invoiceSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full bg-background border rounded-md mt-1 max-h-40 overflow-y-auto">
                            {invoiceSuggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="p-2 hover:bg-accent cursor-pointer"
                                onClick={() => handleSuggestionClick(setInvoiceSearchTermInput, suggestion, searchByInvoice)}
                              >
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button onClick={handleInvoiceSearch} className="w-full">Search</Button>
                    </CardContent>
                  </DialogContent>
                </Dialog>
                <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
                  <DialogTrigger asChild>
                    <Button><FilePlus className="mr-2 h-4 w-4"/>Add New Item</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <AddPIForm onClose={handleFormClose} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {!hasActiveSearch ? (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-700">Search to view items</h3>
                  <p className="text-gray-500 mt-2">Use the search buttons above to find items by supplier or invoice.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button variant="link" onClick={clearSearch} className="p-0 h-auto">Clear Search</Button>
                  {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                      <Card key={item.id} className="flex justify-between items-center p-4 hover:shadow-md transition-shadow">
                        <div>
                          <p className="font-semibold">{item.item_name}</p>
                          <p className="text-sm text-gray-500">
                            Supplier: {item.supplier_name || 'N/A'} | Invoice: {item.supplier_invoice_number || 'N/A'} | Date: {item.invoice_date ? format(new Date(item.invoice_date), 'dd-MM-yyyy') : 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500">
                            Qty: {item.quantity} {item.unit} | Price: ₹{item.price}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </Card>
                    ))
                  ) : (
                     <div className="text-center py-10">
                        <p className="text-gray-600">No items found for your search.</p>
                     </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          {editingItem && (
            <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
              <DialogContent className="sm:max-w-[600px]">
                <EditPIForm item={editingItem} onClose={handleFormClose} />
              </DialogContent>
            </Dialog>
          )}
        </motion.div>
      );
    };

    export default InputMaterialPI;