import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Package, FilePlus, HelpCircle as CircleHelp, Search, FileEdit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import AddPIForm from '@/components/items/AddPIForm';
import CheckStockForm from '@/components/items/CheckStockForm';
import CheckStockBySupplierForm from '@/components/items/CheckStockBySupplierForm';
import SearchEditDeleteSupplierInvoice from '@/components/items/SearchEditDeleteSupplierInvoice';
import useItemManagement from '@/hooks/useItemManagement';

const ItemManagement = () => {
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isCheckStockOpen, setIsCheckStockOpen] = useState(false);
  const [isCheckBySupplierOpen, setIsCheckBySupplierOpen] = useState(false);
  const [isSearchEditOpen, setIsSearchEditOpen] = useState(false);
  
  const { refreshItems } = useItemManagement();

  const handleFormClose = () => {
    setIsAddFormOpen(false);
    refreshItems();
  };

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
          <CardTitle>Item Stock Management</CardTitle>
          <div className="flex gap-2 flex-wrap justify-end">
            <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <FilePlus className="mr-2 h-4 w-4" />
                  Add Supplier Invoice and Items
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
                <AddPIForm onClose={handleFormClose} />
              </DialogContent>
            </Dialog>
            
            <Dialog open={isSearchEditOpen} onOpenChange={setIsSearchEditOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                  <FileEdit className="mr-2 h-4 w-4" /> 
                  Search, Edit and Delete Supplier Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
                <SearchEditDeleteSupplierInvoice onClose={() => setIsSearchEditOpen(false)} />
              </DialogContent>
            </Dialog>

            <Dialog open={isCheckStockOpen} onOpenChange={setIsCheckStockOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                  <CircleHelp className="mr-2 h-4 w-4" />
                  Check Stock
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <CheckStockForm onClose={() => setIsCheckStockOpen(false)} />
              </DialogContent>
            </Dialog>

            <Dialog open={isCheckBySupplierOpen} onOpenChange={setIsCheckBySupplierOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                  <Search className="mr-2 h-4 w-4" />
                  Check Stock by Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px]">
                <CheckStockBySupplierForm onClose={() => setIsCheckBySupplierOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <div className="flex justify-center items-center mb-4">
              <Package className="h-16 w-16 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">Item Stock Module</h3>
            <p className="text-gray-500 mt-2">Use the buttons above to add new items, manage invoices, or check existing stock levels.</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ItemManagement;