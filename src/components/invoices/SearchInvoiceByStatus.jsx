import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  "No GRR", "GRR Ok", "Quality Hold", "Paper Hold", 
  "Capital Hold", "Approved But Not Paid", "Paid"
];

const SEARCH_MODES = [
  { label: "Search Status By Invoice Number", value: "by_invoice" },
  { label: "Search Invoices by Status", value: "by_status" }
];

const SearchInvoiceByStatus = ({ onBack }) => {
  const { toast } = useToast();
  
  // View/Mode State
  const [searchMode, setSearchMode] = useState('');
  
  // Data Fetching State
  const [fetchingInvoices, setFetchingInvoices] = useState(true);
  const [invoices, setInvoices] = useState([]);
  
  // Mode 1: By Invoice Number State
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceStatusResult, setInvoiceStatusResult] = useState(null);
  const [isSearchingInvoice, setIsSearchingInvoice] = useState(false);

  // Mode 2: By Status State
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusInvoicesResults, setStatusInvoicesResults] = useState(null);
  const [isSearchingStatus, setIsSearchingStatus] = useState(false);

  // Fetch all invoices on mount for the searchable dropdown
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
        setFetchingInvoices(false);
      }
    };
    fetchInvoices();
  }, [toast]);

  // Filter for searchable dropdown
  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices;
    return invoices.filter(inv => inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [invoices, searchTerm]);

  // Handle Mode Change
  const handleModeChange = (val) => {
    setSearchMode(val);
    // Reset all specific states when mode changes
    setInvoiceStatusResult(null);
    setStatusInvoicesResults(null);
    setSelectedInvoice(null);
    setSearchTerm('');
    setSelectedStatus('');
  };

  // Select Invoice from dropdown
  const handleSelectInvoice = (inv) => {
    setSelectedInvoice(inv);
    setSearchTerm(inv.invoice_number);
    setShowSuggestions(false);
    setInvoiceStatusResult(null); // Reset result when a new invoice is selected
  };

  // Mode 1 Search Action
  const handleSearchByInvoice = async () => {
    if (!selectedInvoice) return;
    
    setIsSearchingInvoice(true);
    try {
      const { data, error } = await supabase
        .from('invoice_status')
        .select('status')
        .eq('invoice_id', selectedInvoice.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setInvoiceStatusResult(data.status);
      } else {
        setInvoiceStatusResult("No status found");
        toast({ title: "No Result", description: "No status recorded for this invoice yet." });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to fetch invoice status.", variant: "destructive" });
      setInvoiceStatusResult("Error fetching status");
    } finally {
      setIsSearchingInvoice(false);
    }
  };

  // Mode 2 Search Action
  const handleSearchByStatus = async () => {
    if (!selectedStatus) return;

    setIsSearchingStatus(true);
    try {
      const { data, error } = await supabase
        .from('invoice_status')
        .select('invoice_number, status, created_at')
        .eq('status', selectedStatus)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setStatusInvoicesResults(data || []);
      
      if (data && data.length === 0) {
        toast({ title: "No Results", description: `No invoices found with status: ${selectedStatus}` });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to search invoices.", variant: "destructive" });
    } finally {
      setIsSearchingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800">Search Invoice as per Status</h2>
      </div>

      <div className="max-w-md mx-auto space-y-6 py-4">
        <div className="space-y-2">
          <Label>Select Search Mode</Label>
          <Select value={searchMode} onValueChange={handleModeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose Search Mode" />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_MODES.map(mode => (
                <SelectItem key={mode.value} value={mode.value}>
                  {mode.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Conditional Rendering: Mode 1 - By Invoice Number */}
        {searchMode === 'by_invoice' && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="space-y-2 relative">
              <Label>Invoice Number</Label>
              <div className="relative">
                {fetchingInvoices ? (
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
                        setInvoiceStatusResult(null);
                      }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  disabled={fetchingInvoices}
                />
                {showSuggestions && !fetchingInvoices && (
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

            <Button 
              onClick={handleSearchByInvoice} 
              disabled={!selectedInvoice || isSearchingInvoice} 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isSearchingInvoice ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Show Status
            </Button>

            {invoiceStatusResult !== null && (
              <div className="mt-4 p-4 bg-gray-50 border rounded-md space-y-2">
                <Label className="text-gray-500 text-xs uppercase tracking-wider">Current Status</Label>
                <div className={`text-lg font-semibold ${invoiceStatusResult === 'No status found' ? 'text-gray-500 italic' : 'text-blue-700'}`}>
                  {invoiceStatusResult}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Conditional Rendering: Mode 2 - By Status */}
        {searchMode === 'by_status' && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
             <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={(val) => {
                setSelectedStatus(val);
                setStatusInvoicesResults(null); // Reset results when a new status is picked
              }}>
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

            <Button 
              onClick={handleSearchByStatus} 
              disabled={!selectedStatus || isSearchingStatus} 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isSearchingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Show Invoices
            </Button>
          </div>
        )}
      </div>

      {/* Mode 2 Results Table (Rendered full width outside the max-w-md container for better visibility) */}
      {searchMode === 'by_status' && statusInvoicesResults !== null && (
        <div className="mt-6 border rounded-md overflow-hidden min-h-[200px]">
          <div className="bg-gray-100 p-3 border-b font-semibold text-gray-700">Search Results</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                <tr>
                  <th className="p-3">Invoice Number</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {statusInvoicesResults.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-gray-500">
                      No invoices found for this status.
                    </td>
                  </tr>
                ) : (
                  statusInvoicesResults.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{item.invoice_number}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {item.created_at ? format(new Date(item.created_at), 'dd-MM-yyyy HH:mm') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Close Button */}
      <div className="flex justify-end pt-6 border-t mt-6">
        <Button variant="default" onClick={onBack} className="bg-blue-600 hover:bg-blue-700 text-white">Close</Button>
      </div>
    </div>
  );
};

export default SearchInvoiceByStatus;