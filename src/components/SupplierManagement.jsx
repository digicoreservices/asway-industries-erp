import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Search, Truck, Mail, Phone, MapPin, User, Building, Briefcase, AlertCircle, RefreshCw, Loader2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AddSupplierForm from '@/components/suppliers/AddSupplierForm';
import EditSupplierForm from '@/components/suppliers/EditSupplierForm';
import useSupplierManagement from '@/hooks/useSupplierManagement';
import SupplierTransactionDialog from '@/components/suppliers/TransactionDialog';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Something went wrong</h2>
          <p className="text-gray-600 mt-2">Failed to load supplier management interface.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ITEMS_PER_PAGE = 20;

const SupplierManagementInner = () => {
  const {
    suppliers = [],
    loading,
    error,
    deleteSupplier,
    fetchSuppliers = () => {},
  } = useSupplierManagement() || {};

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddSupplierOpen, setAddSupplierOpen] = useState(false);
  const [isEditSupplierOpen, setEditSupplierOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const hideTransactionButtons = true;

  // Reset pagination when search changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm]);

  const handleDelete = async (id) => {
    if (deleteSupplier) {
      await deleteSupplier(id);
    }
  };

  const onSupplierAdded = useCallback(() => {
    fetchSuppliers(true);
    setAddSupplierOpen(false);
  }, [fetchSuppliers]);

  const onSupplierUpdated = useCallback(() => {
    fetchSuppliers(true);
    setEditSupplierOpen(false);
    setEditingSupplierId(null);
  }, [fetchSuppliers]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (supplier) => {
    setSearchTerm(supplier.supplier_name);
    setShowSuggestions(false);
  };
  
  const handleEditClick = (supplierId) => {
    setEditingSupplierId(supplierId);
    setEditSupplierOpen(true);
  };

  const confirmDelete = () => {
    if (supplierToDelete) {
      handleDelete(supplierToDelete);
      setSupplierToDelete(null);
    }
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return suppliers;
    const lowercasedFilter = searchTerm.toLowerCase();
    return suppliers.filter(supplier => 
      (supplier.supplier_name && supplier.supplier_name.toLowerCase().includes(lowercasedFilter)) ||
      (supplier.supplier_id && supplier.supplier_id.toLowerCase().includes(lowercasedFilter)) ||
      (supplier.contact_person && supplier.contact_person.toLowerCase().includes(lowercasedFilter))
    );
  }, [suppliers, searchTerm]);

  const visibleSuppliers = useMemo(() => {
    return filteredSuppliers.slice(0, visibleCount);
  }, [filteredSuppliers, visibleCount]);

  const suggestionList = useMemo(() => {
    if (!searchTerm) return [];
    return filteredSuppliers.slice(0, 10);
  }, [filteredSuppliers, searchTerm]);

  const errorMessageText = error?.message || (typeof error === 'string' ? error : "We encountered an issue fetching supplier records.");

  return (
    <div className="p-4 md:p-6 bg-gray-50/50 min-h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              Supplier Management
              {loading && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
            </h1>
            <p className="text-gray-500">View, add, edit, and delete supplier records.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={isAddSupplierOpen} onOpenChange={setAddSupplierOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white" disabled={loading && suppliers.length === 0}>
                  <Plus size={16} /> Add New
                </Button>
              </DialogTrigger>
              <AddSupplierForm onSupplierAdded={onSupplierAdded} isOpen={isAddSupplierOpen} />
            </Dialog>
            {!hideTransactionButtons && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2" disabled={loading && suppliers.length === 0}>
                    Check Transactions
                  </Button>
                </DialogTrigger>
                <SupplierTransactionDialog title="Check Supplier Transactions" type="check" />
              </Dialog>
            )}
            {!hideTransactionButtons && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2" disabled={loading && suppliers.length === 0}>
                    Add Transaction
                  </Button>
                </DialogTrigger>
                <SupplierTransactionDialog title="Add Supplier Transaction" type="add" />
              </Dialog>
            )}
            <Dialog open={isEditSupplierOpen} onOpenChange={(open) => {
              if (!open) setEditingSupplierId(null);
              setEditSupplierOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 hidden" onClick={() => handleEditClick(null)}>
                  <Edit size={16} /> Edit
                </Button>
              </DialogTrigger>
              <EditSupplierForm onSupplierUpdated={onSupplierUpdated} supplierId={editingSupplierId} suppliers={suppliers} />
            </Dialog>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200 text-red-900">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Suppliers</AlertTitle>
            <AlertDescription className="flex items-center justify-between flex-wrap gap-4 mt-2">
              <span className="font-medium">
                {error === 'timeout' || error?.message?.includes('timeout')
                  ? "The request took too long. Please check your network connection and try again." 
                  : errorMessageText}
              </span>
              <Button size="sm" variant="outline" onClick={() => fetchSuppliers(true)} className="bg-white hover:bg-red-50 text-red-700 border-red-300">
                <RefreshCw className="mr-2 h-4 w-4" /> Retry Fetch
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search suppliers by name, ID, or contact..."
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="pl-10 border-gray-300 bg-white"
            disabled={loading && suppliers.length === 0}
          />
          {showSuggestions && searchTerm && suggestionList.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
              {suggestionList.map(supplier => (
                <div
                  key={supplier.id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSuggestionClick(supplier)}
                >
                  <p className="font-semibold text-gray-800">{supplier.supplier_name}</p>
                  <p className="text-sm text-gray-500">{supplier.supplier_id}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {loading && suppliers.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-t-4 border-t-gray-200 bg-white">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <AlertDialog>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleSuppliers.map((supplier, index) => (
                <motion.div
                  key={supplier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="hover:shadow-xl transition-shadow duration-300 ease-in-out border-t-4 border-t-green-500 flex flex-col h-full bg-white">
                    <CardHeader className="flex flex-row justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-gray-800">{supplier.supplier_name}</CardTitle>
                        <CardDescription>ID: {supplier.supplier_id}</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(supplier.id)}>
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setSupplierToDelete(supplier.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm flex-grow">
                      {supplier.contact_person && (
                        <div className="flex items-center gap-3 text-gray-600">
                          <User size={16} className="text-green-500 shrink-0" />
                          <span>{supplier.contact_person}</span>
                        </div>
                      )}
                      {supplier.contact_number && (
                        <div className="flex items-center gap-3 text-gray-600">
                          <Phone size={16} className="text-green-500 shrink-0" />
                          <span>{supplier.contact_number}</span>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="flex items-center gap-3 text-gray-600">
                          <Mail size={16} className="text-green-500 shrink-0" />
                          <span className="truncate">{supplier.email}</span>
                        </div>
                      )}
                      {supplier.address && (
                        <div className="flex items-start gap-3 text-gray-600">
                          <MapPin size={16} className="text-green-500 mt-1 shrink-0" />
                          <span className="flex-1 line-clamp-3">{supplier.address}</span>
                        </div>
                      )}
                    </CardContent>
                    {supplier.departments && supplier.departments.length > 0 && (
                      <CardFooter className="flex-col items-start gap-2 pt-4 border-t mt-auto">
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Departments & Users</h4>
                        {supplier.departments.map((dept, i) => (
                          <div key={i} className="w-full p-2 bg-gray-50 rounded-md border border-gray-200">
                            <div className="flex items-center gap-2 font-medium text-gray-800">
                              {dept.department && <><Building size={14} className="text-gray-500" /><span>{dept.department}</span></>}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600 mt-1 pl-1">
                              {dept.user && <><Briefcase size={14} className="text-gray-500" /><span>{dept.user}</span></>}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600 mt-1 pl-1">
                              {dept.contactNumber && <><Phone size={14} className="text-gray-500" /><span>{dept.contactNumber}</span></>}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600 mt-1 pl-1">
                              {dept.emailId && <><Mail size={14} className="text-gray-500" /><span>{dept.emailId}</span></>}
                            </div>
                          </div>
                        ))}
                      </CardFooter>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>

            {visibleCount < filteredSuppliers.length && (
              <div className="mt-8 flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={handleLoadMore} 
                  className="bg-white hover:bg-gray-50 flex items-center gap-2 shadow-sm"
                >
                  Load More <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}

            {filteredSuppliers.length === 0 && !searchTerm && !loading && !error && (
               <div className="text-center py-16 text-gray-500 bg-white rounded-lg border border-gray-200 mt-6">
                <Truck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-800">No Suppliers Added</h3>
                <p className="mt-1">Get started by adding a new supplier.</p>
              </div>
            )}
            
            {filteredSuppliers.length === 0 && searchTerm && !loading && (
              <div className="text-center py-16 text-gray-500 bg-white rounded-lg border border-gray-200 mt-6">
                <Truck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-800">No Suppliers Found</h3>
                <p className="mt-1">Your search for "{searchTerm}" did not return any results.</p>
              </div>
            )}

            <AlertDialogContent className="bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-gray-900">Are you sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-600">
                  This action cannot be undone. This will permanently delete the supplier record. 
                  Please ensure this supplier has no associated Items, Purchase Orders, or other records before proceeding.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSupplierToDelete(null)} className="text-gray-700">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </motion.div>
    </div>
  );
};

const SupplierManagement = () => (
  <ErrorBoundary>
    <SupplierManagementInner />
  </ErrorBoundary>
);

export default SupplierManagement;