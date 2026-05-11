import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Search } from 'lucide-react';

const STATUS_OPTIONS = [
  "No GRR", "GRR Ok", "Quality Hold", "Paper Hold", 
  "Capital Hold", "Approved But Not Paid", "Paid"
];

const UpdateInvoiceStatusForm = ({ onBack }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [invoices, setInvoices] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [currentStatus, setCurrentStatus] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusRecordId, setStatusRecordId] = useState(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('id, invoice_number')
          .order('invoice_number', { ascending: true });
        
        if (error) throw error;
        setInvoices(data || []);
      } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Failed to load invoices.", variant: "destructive" });
      } finally {
        setFetching(false);
      }
    };
    fetchInvoices();
  }, [toast]);

  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices;
    return invoices.filter(inv => inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [invoices, searchTerm]);

  const fetchCurrentStatus = async (invoiceId) => {
    try {
      const { data, error } = await supabase
        .from('invoice_status')
        .select('id, status')
        .eq('invoice_id', invoiceId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setCurrentStatus(data.status);
        setStatusRecordId(data.id);
      } else {
        setCurrentStatus('No status found');
        setStatusRecordId(null);
      }
    } catch (err) {
      console.error(err);
      setCurrentStatus('Error fetching status');
    }
  };

  const handleSelectInvoice = (inv) => {
    setSelectedInvoice(inv);
    setSearchTerm(inv.invoice_number);
    setShowSuggestions(false);
    fetchCurrentStatus(inv.id);
  };

  const handleUpdate = async () => {
    if (!selectedInvoice) {
      toast({ title: "Validation Error", description: "Please select an invoice.", variant: "destructive" });
      return;
    }
    if (!newStatus) {
      toast({ title: "Validation Error", description: "Please select a new status.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (statusRecordId) {
        const { error } = await supabase
          .from('invoice_status')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', statusRecordId);
        if (error) throw error;
      } else {
        // If no status existed, create one
        const { error } = await supabase.from('invoice_status').insert([{
          invoice_id: selectedInvoice.id,
          invoice_number: selectedInvoice.invoice_number,
          status: newStatus
        }]);
        if (error) throw error;
      }

      toast({ title: "Success", description: "Invoice status updated successfully!" });
      setCurrentStatus(newStatus);
      setNewStatus('');
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800">Update Invoice Status</h2>
      </div>

      <div className="space-y-4 max-w-md mx-auto py-6">
        <div className="space-y-2 relative">
          <Label>Invoice Number</Label>
          <div className="relative">
            {fetching ? (
               <Loader2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
               <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            )}
            <Input 
              className="pl-9"
              placeholder="Search Invoice Number..."
              value={searchTerm} 
              onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                  if (selectedInvoice) {
                    setSelectedInvoice(null);
                    setCurrentStatus('');
                    setStatusRecordId(null);
                  }
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              disabled={fetching}
            />
            {showSuggestions && !fetching && (
              <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-[200px] overflow-auto mt-1">
                  {filteredInvoices.length > 0 ? (
                      filteredInvoices.map((inv) => (
                          <div 
                              key={inv.id} 
                              className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onMouseDown={(e) => { e.preventDefault(); handleSelectInvoice(inv); }}
                          >
                              {inv.invoice_number}
                          </div>
                      ))
                  ) : (
                      <div className="p-2 text-sm text-gray-500">No invoices found</div>
                  )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Current Invoice Status</Label>
          <Input 
            value={currentStatus} 
            readOnly 
            className="bg-gray-50 text-gray-600 font-medium" 
            placeholder="Will auto-populate..."
          />
        </div>

        <div className="space-y-2">
          <Label>Update Status</Label>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select New Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <Button variant="default" onClick={onBack} className="bg-blue-600 hover:bg-blue-700 text-white">Close</Button>
          <Button onClick={handleUpdate} disabled={loading || !selectedInvoice} className="bg-blue-600 hover:bg-blue-700">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpdateInvoiceStatusForm;