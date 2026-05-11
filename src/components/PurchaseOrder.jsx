
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import AddPurchaseOrderForm from '@/components/purchase-orders/AddPurchaseOrderForm';
import SearchPOSupplier from '@/components/supplier-po-receipts/SearchPOSupplier';

const PurchaseOrder = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isSearchEditFormOpen, setIsSearchEditFormOpen] = useState(false);

  const handleFeatureNotImplemented = (feature) => {
    toast({
      title: `🚧 ${feature} Feature Not Implemented`,
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
      variant: 'destructive',
    });
  };

  return (
    <>
      <Helmet>
        <title>Purchase Order Management - Asway Industries ERP</title>
        <meta name="description" content="Manage purchase orders for Asway Industries." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-4 md:p-6"
      >
        <Card className="shadow-lg border-0">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-2xl font-bold tracking-tight text-gray-800">Purchase Order Management</CardTitle>
            <div className="flex flex-col md:flex-row items-center gap-2">
              <div className="flex w-full md:w-auto">
                <Input
                  type="text"
                  placeholder="Search by ID or supplier..."
                  className="w-full md:w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button variant="outline" className="ml-2" onClick={() => handleFeatureNotImplemented('Search Purchase Order')}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add New
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                  <AddPurchaseOrderForm onClose={() => setIsAddFormOpen(false)} />
                </DialogContent>
              </Dialog>
              <Dialog open={isSearchEditFormOpen} onOpenChange={setIsSearchEditFormOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Search className="mr-2 h-4 w-4" /> Search, Edit and Delete
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
                  <SearchPOSupplier onClose={() => setIsSearchEditFormOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
            <div className="border-2 border-dashed rounded-lg p-12 text-center bg-gray-50">
              <h3 className="text-lg font-medium text-gray-700">Purchase Order Data</h3>
              <p className="text-gray-500 mt-2">
                Purchase orders will be displayed here once the functionality is implemented.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
};

export default PurchaseOrder;
