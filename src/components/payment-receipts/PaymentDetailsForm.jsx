import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, Loader2, FileText, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import useClientManagement from '@/hooks/useClientManagement';
import PaymentDetailsModal from '@/components/payment-receipts/PaymentDetailsModal';

const PaymentDetailsForm = ({ onClose }) => {
  const { clients } = useClientManagement();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);
  
  const [selectedPayment, setSelectedPayment] = useState(null);

  const filteredClients = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return clients.filter(c => 
      c.customer_name?.toLowerCase().includes(term) ||
      c.customer_id?.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [clients, searchTerm]);

  const handleSuggestionClick = (client) => {
    setSelectedCustomer(client);
    setSearchTerm(client.customer_name);
    setShowSuggestions(false);
    setHasSearched(false);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setSelectedCustomer(null);
    setShowSuggestions(true);
    setHasSearched(false);
  };

  const fetchPayments = async () => {
    if (!selectedCustomer) {
      setError("Please select a customer from the dropdown suggestions first.");
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // Fetch regular invoice payments
      const { data: invoicePayments, error: invoiceErr } = await supabase
        .from('payment_receipts')
        .select('*')
        .eq('customer_id', selectedCustomer.id);

      if (invoiceErr) throw invoiceErr;

      // Fetch advance payments
      const { data: advancePayments, error: advanceErr } = await supabase
        .from('advance_payment_receipts')
        .select('*')
        .eq('customer_id', selectedCustomer.id);

      if (advanceErr) throw advanceErr;

      // Combine and format data
      const combined = [
        ...(invoicePayments || []).map(p => ({ ...p, payment_type: 'Invoice Payment' })),
        ...(advancePayments || []).map(p => ({ ...p, payment_type: 'Advance Payment' }))
      ];

      // Sort by payment_date descending
      combined.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

      setPayments(combined);
    } catch (err) {
      console.error("Error fetching payments:", err);
      setError("Failed to fetch payment details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount);
    return isNaN(num) ? '₹0.00' : `₹${num.toFixed(2)}`;
  };

  return (
    <Card className="w-full h-full border-none shadow-none rounded-none bg-white">
      <CardHeader className="bg-gray-50 border-b px-6 py-4 flex flex-row items-center justify-between sticky top-0 z-10">
        <CardTitle className="text-xl text-gray-800">Payment Details</CardTitle>
        {onClose && (
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 flex items-center gap-2"
              onClick={onClose}
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
        )}
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-end max-w-2xl">
          <div className="w-full relative space-y-2">
            <Label htmlFor="customer-search">Customer Name</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="customer-search"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search and select customer..."
                className="pl-9 bg-white"
                autoComplete="off"
              />
            </div>
            
            {showSuggestions && filteredClients.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredClients.map(client => (
                  <div
                    key={client.id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onClick={() => handleSuggestionClick(client)}
                  >
                    <p className="font-semibold text-gray-800">{client.customer_name}</p>
                    <p className="text-xs text-gray-500">{client.customer_id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <Button 
            onClick={fetchPayments} 
            disabled={loading || !selectedCustomer}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Show
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {hasSearched && !loading && !error && (
          <div className="mt-6 border rounded-md bg-white overflow-hidden">
            {payments.length === 0 ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center">
                <FileText className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-lg font-medium text-gray-700">No Payments Found</p>
                <p className="text-sm">There are no payment records for this customer.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[50vh]">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0">
                    <TableRow>
                      <TableHead>Payment Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference Number</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            payment.payment_type === 'Advance Payment' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {payment.payment_type}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{payment.reference_number || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={() => setSelectedPayment(payment)}
                            className="text-blue-600 hover:text-blue-800 p-0"
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <PaymentDetailsModal 
        payment={selectedPayment} 
        isOpen={!!selectedPayment} 
        onClose={() => setSelectedPayment(null)} 
      />
    </Card>
  );
};

export default PaymentDetailsForm;