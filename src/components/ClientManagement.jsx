import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Search, User, Mail, Phone, MapPin, Building, Users as UsersIcon, AlertCircle, RefreshCw, Loader2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import AddClientForm from '@/components/clients/AddClientForm';
import EditClientForm from '@/components/clients/EditClientForm';
import useClientManagement from '@/hooks/useClientManagement';
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
          <p className="text-gray-600 mt-2">Failed to load customer management interface.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ITEMS_PER_PAGE = 20;

const ClientManagementInner = () => {
  const {
    clients = [],
    loading,
    error,
    deleteClient,
    fetchClients,
  } = useClientManagement() || {};

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isAddClientOpen, setAddClientOpen] = useState(false);
  const [isEditClientOpen, setEditClientOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Reset pagination when search changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm]);

  const filteredClients = useMemo(() => {
    if (!Array.isArray(clients)) return [];
    if (!searchTerm) return clients;
    
    const term = searchTerm.toLowerCase();
    return clients.filter(c => 
      c?.customer_name?.toLowerCase().includes(term) ||
      c?.customer_id?.toLowerCase().includes(term) ||
      c?.contact_number?.includes(term)
    );
  }, [clients, searchTerm]);

  const visibleClients = useMemo(() => {
    return filteredClients.slice(0, visibleCount);
  }, [filteredClients, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  const handleDelete = async () => {
    if (deleteClient && clientToDelete) {
      await deleteClient(clientToDelete);
      setClientToDelete(null);
    }
  };

  const handleSuggestionClick = (clientName) => {
    setSearchTerm(clientName);
    setShowSuggestions(false);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowSuggestions(true);
  };

  const onClientAdded = useCallback(() => {
    if (fetchClients) fetchClients(true);
    setAddClientOpen(false);
  }, [fetchClients]);

  const onClientUpdated = useCallback(() => {
    if (fetchClients) fetchClients(true);
    setEditClientOpen(false);
    setEditingClientId(null);
  }, [fetchClients]);

  const handleEditClick = (clientId) => {
    setEditingClientId(clientId);
    setEditClientOpen(true);
  };

  const renderDepartments = (client) => {
    if (!client) return null;
    
    const departments = [];
    for (let i = 1; i <= 5; i++) {
        const userName = client[`user${i}`];
        const contactPerson = client[`department${i}`]; 
        const contactNumber = client[`contact_number_dept${i}`];
        const email = client[`email_dept${i}`];

        if (userName || contactPerson || contactNumber || email) {
            departments.push(
                <div key={`dep-${i}`} className="text-xs pl-5 border-l border-gray-200 ml-2 py-1">
                    {userName && <div className="flex items-center gap-2"><UsersIcon size={12} className="text-gray-400" /><span>User: {userName}</span></div>}
                    {contactPerson && <div className="flex items-center gap-2"><User size={12} className="text-gray-400" /><span>Contact: {contactPerson}</span></div>}
                    {contactNumber && <div className="flex items-center gap-2"><Phone size={12} className="text-gray-400" /><span>{contactNumber}</span></div>}
                    {email && <div className="flex items-center gap-2"><Mail size={12} className="text-gray-400" /><span>{email}</span></div>}
                </div>
            );
        }
    }
    return departments.length > 0 ? <div className="space-y-1 mt-2">{departments}</div> : null;
  };

  const errorMessageText = error?.message || (typeof error === 'string' ? error : "We encountered an issue fetching customer records.");

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
              Customer Management
              {loading && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
            </h1>
            <p className="text-gray-500">View, add, edit, and delete customer records.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={isAddClientOpen} onOpenChange={setAddClientOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700" disabled={loading && clients.length === 0}>
                  <Plus size={16} /> Add New
                </Button>
              </DialogTrigger>
              <AddClientForm onClientAdded={onClientAdded} />
            </Dialog>
            <Dialog open={isEditClientOpen} onOpenChange={(open) => {
              if (!open) setEditingClientId(null);
              setEditClientOpen(open);
            }}>
               <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 hidden" disabled={loading && clients.length === 0}>
                    <Edit size={16} /> Edit
                  </Button>
              </DialogTrigger>
              {editingClientId && (
                <EditClientForm 
                  onClientUpdated={onClientUpdated} 
                  clientId={editingClientId} 
                  clients={clients || []} 
                />
              )}
            </Dialog>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200 text-red-900">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Customers</AlertTitle>
            <AlertDescription className="flex items-center justify-between flex-wrap gap-4 mt-2">
              <span className="font-medium">
                {error === 'timeout' || error?.message?.includes('timeout')
                  ? "The request took too long. Please check your network connection and try again." 
                  : errorMessageText}
              </span>
              <Button size="sm" variant="outline" onClick={() => fetchClients && fetchClients(true)} className="bg-white hover:bg-red-50 text-red-700 border-red-300">
                <RefreshCw className="mr-2 h-4 w-4" /> Retry Fetch
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search customers by name, ID, or contact..."
            value={searchTerm || ''}
            onChange={handleSearchChange}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="pl-10 text-gray-900 bg-white border-gray-300"
            disabled={loading && clients.length === 0}
          />
          {searchTerm && showSuggestions && filteredClients?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg"
            >
                <ul className="max-h-60 overflow-y-auto">
                  {filteredClients.slice(0, 10).map((client) => (
                    <li
                      key={client?.id || Math.random()}
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-gray-800"
                      onClick={() => handleSuggestionClick(client?.customer_name || '')}
                    >
                      {client?.customer_name} ({client?.customer_id})
                    </li>
                  ))}
                </ul>
            </motion.div>
          )}
        </div>

        {loading && clients.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-t-4 border-t-gray-200">
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
              {visibleClients?.map((client, index) => (
                <motion.div
                  key={client?.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="hover:shadow-xl transition-shadow duration-300 ease-in-out border-t-4 border-t-blue-500 bg-white h-full flex flex-col">
                    <CardHeader className="flex flex-row justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-gray-800">{client?.customer_name}</CardTitle>
                        <CardDescription>ID: {client?.customer_id}</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(client?.id)}>
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setClientToDelete(client?.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </AlertDialogTrigger>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm flex-grow">
                       {client?.contact_person && (
                         <div className="flex items-center gap-3 text-gray-600">
                          <User size={16} className="text-blue-500 shrink-0" />
                          <span className="truncate">{client.contact_person}</span>
                        </div>
                       )}
                      {client?.contact_number && (
                        <div className="flex items-center gap-3 text-gray-600">
                          <Phone size={16} className="text-blue-500 shrink-0" />
                          <span className="truncate">{client.contact_number}</span>
                        </div>
                      )}
                      {client?.email && (
                        <div className="flex items-center gap-3 text-gray-600">
                          <Mail size={16} className="text-blue-500 shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client?.address && (
                        <div className="flex items-start gap-3 text-gray-600">
                          <MapPin size={16} className="text-blue-500 mt-1 shrink-0" />
                          <span className="flex-1 line-clamp-2">{client.address}</span>
                        </div>
                      )}
                      {renderDepartments(client)}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {visibleCount < filteredClients.length && (
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

            <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-gray-900">Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-600">
                        This action cannot be undone. This will permanently delete the customer record.
                        Please ensure this customer has no associated Work Orders, Quotations, or other records before proceeding.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setClientToDelete(null)} className="text-gray-700">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {(!filteredClients || filteredClients.length === 0) && !searchTerm && !loading && !error && (
           <div className="text-center py-16 text-gray-500 bg-white rounded-lg border border-gray-200 mt-6">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-800">No Customers Added</h3>
            <p className="mt-1">Get started by adding a new customer or adjusting your search.</p>
          </div>
        )}
        
        {(!filteredClients || filteredClients.length === 0) && searchTerm && !loading && (
           <div className="text-center py-16 text-gray-500 bg-white rounded-lg border border-gray-200 mt-6">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-800">No Customers Found</h3>
            <p className="mt-1">Your search for "{searchTerm}" did not return any results.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const ClientManagement = () => (
  <ErrorBoundary>
    <ClientManagementInner />
  </ErrorBoundary>
);

export default ClientManagement;