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

const AddInvoiceStatusForm = ({ onBack }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [invoices, setInvoices] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [status, setStatus] = useState('');

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

  const handleSelectInvoice = (inv) => {
    setSelectedInvoice(inv);
    setSearchTerm(inv.invoice_number);
    setShowSuggestions(false);
  };

  const handleSave = async () => {
    if (!selectedInvoice) {
      toast({ title: "Validation Error", description: "Please select an invoice.", variant: "destructive" });
      return;
    }
    if (!status) {
      toast({ title: "Validation Error", description: "Please select a status.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Check if status already exists
      const { data: existing, error: checkErr } = await supabase
        .from('invoice_status')
        .select('id')
        .eq('invoice_id', selectedInvoice.id)
        .maybeSingle();
      
      if (checkErr) throw checkErr;
      
      if (existing) {
        toast({ title: "Status Exists", description: "Status already exists for this invoice. Use Update form instead.", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from('invoice_status').insert([{
        invoice_id: selectedInvoice.id,
        invoice_number: selectedInvoice.invoice_number,
        status: status
      }]);

      if (error) throw error;

      toast({ title: "Success", description: "Invoice status added successfully!" });
      setSelectedInvoice(null);
      setSearchTerm('');
      setStatus('');
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
        <h2 className="text-xl font-bold text-gray-800">Add New Invoice Status</h2>
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
                  if (selectedInvoice) setSelectedInvoice(null);
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
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select Status" />
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
          <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddInvoiceStatusForm;