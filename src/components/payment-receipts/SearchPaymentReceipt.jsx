import React, { useState, useMemo } from 'react';
import { Search, Loader2, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import EditPaymentReceiptForm from './EditPaymentReceiptForm';
import useClientManagement from '@/hooks/useClientManagement';

const SearchPaymentReceipt = ({ onClose }) => {
  const { toast } = useToast();
  const { clients, loading: clientsLoading } = useClientManagement();
  
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    return clients.filter(c => c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [clients, searchTerm]);

  const fetchReceipts = async (searchQuery = '') => {
    setLoading(true);
    try {
      let query = supabase
        .from('payment_receipts')
        .select(`
          *,
          customers!inner ( customer_name )
        `)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('customers.customer_name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast({ title: "Error", description: "Failed to fetch payment receipts.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setHasSearched(true);
    setShowSuggestions(false);
    fetchReceipts(searchTerm);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment receipt? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payment_receipts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Success", description: "Payment Receipt deleted successfully" });
      fetchReceipts(searchTerm);
    } catch (error) {
      console.error("Error deleting receipt:", error);
      toast({ title: "Error", description: "Failed to delete receipt", variant: "destructive" });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd-MM-yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  const handleEditClick = (receipt) => {
    setEditingReceipt({ ...receipt });
  };

  const handleCloseEdit = () => {
    setEditingReceipt(null);
  };

  const handleEditSuccess = () => {
    setEditingReceipt(null);
    fetchReceipts(searchTerm);
  };

  return (
    <div className="bg-white p-6 rounded-lg w-full relative z-10 shadow-sm border border-gray-100">
      <div className="flex justify-end border-b border-gray-100 pb-4 mb-6">
        {onClose && (
          <Button 
            onClick={onClose} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        )}
      </div>

      <div className="space-y-3 mb-8">
        <Label className="text-gray-700 font-medium">Customer Name</Label>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            {clientsLoading ? (
              <Loader2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            )}
            <Input 
              placeholder={clientsLoading ? "Loading customers..." : "Search by Customer Name..."} 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-9 bg-white border-gray-300"
              disabled={clientsLoading}
            />
            {showSuggestions && !clientsLoading && (
              <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-md shadow-xl max-h-[200px] overflow-auto mt-1">
                {filteredClients.length > 0 ? (
                  filteredClients.map((c, index) => (
                    <div 
                      key={c.id || index} 
                      className="p-3 hover:bg-blue-50 cursor-pointer text-sm text-gray-900 border-b last:border-0 border-gray-100"
                      onMouseDown={(e) => { 
                        e.preventDefault(); 
                        setSearchTerm(c.customer_name);
                        setShowSuggestions(false);
                      }}
                    >
                      {c.customer_name}
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-sm text-gray-500 bg-gray-50">No customers found</div>
                )}
              </div>
            )}
          </div>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Search className="w-4 h-4 mr-2" /> Search
          </Button>
        </form>
      </div>

      {hasSearched && (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700 font-medium">
              <tr>
                <th className="p-3">Receipt No</th>
                <th className="p-3">Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Reference</th>
                <th className="p-3 text-right">Amount (₹)</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center">
                    <div className="flex justify-center items-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading receipts...
                    </div>
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">No payment receipts found.</td>
                </tr>
              ) : (
                receipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">{receipt.receipt_number}</td>
                    <td className="p-3">{formatDate(receipt.payment_date)}</td>
                    <td className="p-3">{receipt.customers?.customer_name || 'Unknown'}</td>
                    <td className="p-3">{receipt.payment_mode}</td>
                    <td className="p-3">{receipt.reference_number || '-'}</td>
                    <td className="p-3 text-right font-semibold">{receipt.amount?.toFixed(2)}</td>
                    <td className="p-3 flex justify-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditClick(receipt)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(receipt.id)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editingReceipt} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {editingReceipt && (
            <EditPaymentReceiptForm 
              receipt={editingReceipt} 
              onSuccess={handleEditSuccess} 
              onClose={handleCloseEdit} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SearchPaymentReceipt;