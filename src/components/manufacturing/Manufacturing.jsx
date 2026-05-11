import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Search, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Import sub-components
import ManufacturingForm from '@/components/manufacturing/ManufacturingForm';
import SearchManufacturing from '@/components/manufacturing/SearchManufacturing';
import DeleteManufacturingForm from '@/components/manufacturing/DeleteManufacturingForm';
import Breadcrumb from '@/components/Breadcrumb';

const Manufacturing = () => {
  const [view, setView] = useState('dashboard'); // 'dashboard', 'add', 'search', 'delete'
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Manufacturing' }
  ];

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('manufacturing')
        .select(`
          *,
          customers(customer_name),
          work_orders(work_order_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching manufacturing records:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load manufacturing records."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'dashboard') {
      fetchRecords();
    }
  }, [view]);

  const renderDashboard = () => (
    <div className="space-y-6 mt-4">
      <div className="flex flex-col md:flex-row gap-4">
        <Button 
          onClick={() => setView('add')} 
          className="bg-blue-600 hover:bg-blue-700 text-white flex-1 md:flex-none justify-center"
        >
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
        <Button 
          onClick={() => setView('delete')} 
          className="bg-blue-600 hover:bg-blue-700 text-white flex-1 md:flex-none justify-center"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
        <Button 
          onClick={() => setView('search')} 
          className="bg-blue-600 hover:bg-blue-700 text-white flex-1 md:flex-none justify-center"
        >
          <Search className="mr-2 h-4 w-4" /> Search and Edit
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-12 bg-card rounded-lg border border-dashed">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-card rounded-lg border-2 border-dashed border-gray-200">
          <FileText className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No Manufacturing Records Found</h3>
          <p className="text-gray-500 text-center max-w-md">
            There are currently no manufacturing records in the system. Click the "Add New" button above to create your first record.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-gray-900">Manufacturing #</TableHead>
                  <TableHead className="font-semibold text-gray-900">Customer</TableHead>
                  <TableHead className="font-semibold text-gray-900">Work Order</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">Selling Price</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium text-blue-600">{record.manufacturing_number}</TableCell>
                    <TableCell>{record.customers?.customer_name || 'N/A'}</TableCell>
                    <TableCell>{record.work_orders?.work_order_number || 'N/A'}</TableCell>
                    <TableCell className="text-right font-medium">₹{record.selling_price?.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-gray-500">
                      {new Date(record.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Manufacturing - Asway Industries ERP</title>
        <meta name="description" content="Manufacturing processes." />
      </Helmet>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-4 md:p-6 max-w-7xl mx-auto"
      >
        <Breadcrumb items={breadcrumbItems} />

        {view === 'dashboard' && renderDashboard()}
        
        {view === 'add' && (
          <div className="mt-4">
            <ManufacturingForm setView={setView} />
          </div>
        )}
        
        {view === 'search' && (
          <div className="mt-4">
            <SearchManufacturing onClose={() => setView('dashboard')} />
          </div>
        )}
        
        {view === 'delete' && (
          <div className="mt-4 max-w-xl">
            <DeleteManufacturingForm 
              onSuccess={() => setView('dashboard')} 
              onClose={() => setView('dashboard')}
            />
          </div>
        )}

      </motion.div>
    </>
  );
};

export default Manufacturing;