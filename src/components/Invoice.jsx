import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Search, FileText, ArrowLeft, Receipt, CreditCard, Wallet, Activity, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import CreateInvoiceForm from '@/components/invoices/CreateInvoiceForm';
import SearchInvoice from '@/components/invoices/SearchInvoice';
import PaymentReceiptOptions from '@/components/invoices/PaymentReceiptOptions';
import CreateAdvancePaymentReceiptForm from '@/components/payment-receipts/CreateAdvancePaymentReceiptForm';
import PaymentReceipt from '@/components/PaymentReceipt';
import InvoiceStatusManagement from '@/components/invoices/InvoiceStatusManagement';
import PaymentDetailsForm from '@/components/payment-receipts/PaymentDetailsForm';
import SearchAdvancePaymentReceipt from '@/components/payment-receipts/SearchAdvancePaymentReceipt';

const Invoice = () => {
  const [viewMode, setViewMode] = useState('home'); // home, billing, payment, payment-receipts, payment-receipt-management, advance-payment-management
  
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isSearchInvoiceOpen, setIsSearchInvoiceOpen] = useState(false);
  const [isAdvancePaymentOpen, setIsAdvancePaymentOpen] = useState(false); 
  const [isSearchAdvancePaymentOpen, setIsSearchAdvancePaymentOpen] = useState(false);
  const [isInvoiceStatusOpen, setIsInvoiceStatusOpen] = useState(false);
  const [isPaymentDetailsOpen, setIsPaymentDetailsOpen] = useState(false);

  const { toast } = useToast();

  const handleInvoiceSuccess = () => {
      toast({ title: "Success", description: "Invoice saved successfully!" });
  };

  const handlePaymentSuccess = () => {
      setIsAdvancePaymentOpen(false);
  };

  const handleSearchAndEdit = () => {
      setIsSearchInvoiceOpen(true);
  };

  const resetView = () => setViewMode('home');

  const handleBack = () => {
    if (viewMode === 'payment-receipt-management' || viewMode === 'advance-payment-management') {
        setViewMode('payment-receipts');
    } else if (viewMode === 'payment-receipts') {
        setViewMode('payment');
    } else if (viewMode === 'billing' || viewMode === 'payment') {
        resetView();
    } else {
        resetView();
    }
  };

  return (
    <>
      <Helmet>
        <title>Invoice - Asway Industries ERP</title>
        <meta name="description" content="Manage Invoices" />
      </Helmet>

      <div className="p-4 md:p-6 min-h-screen bg-gray-50/50">
        
        {/* Navigation Back Button (visible if not home) */}
        {viewMode !== 'home' && (
             <div className="mb-6">
                <Button 
                  onClick={handleBack}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> 
                  {viewMode === 'payment-receipt-management' || viewMode === 'advance-payment-management' ? 'Back to Options' : 
                   viewMode === 'payment-receipts' ? 'Back to Payment' : 'Back to Menu'}
                </Button>
             </div>
        )}

        {/* View: Home (Initial Selection) */}
        {viewMode === 'home' && (
           <div className="flex flex-col min-h-[80vh] items-center justify-start pt-10">
             <h1 className="text-3xl font-bold text-gray-800 mb-10 text-center">Invoice and Payment for Customer</h1>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
                {/* Billing Button */}
                <Card 
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-500 bg-white group" 
                  onClick={() => setViewMode('billing')}
                >
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[250px]">
                      <div className="p-4 bg-blue-100 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                          <FileText className="h-12 w-12" />
                      </div>
                      <div className="space-y-2">
                          <h2 className="text-2xl font-bold text-gray-800">Billing</h2>
                          <p className="text-gray-500 text-sm">Create and manage customer invoices</p>
                      </div>
                  </CardContent>
                </Card>

                {/* Payment Button */}
                <Card 
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-500 bg-white group" 
                  onClick={() => setViewMode('payment')}
                >
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[250px]">
                      <div className="p-4 bg-blue-100 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                          <Wallet className="h-12 w-12" />
                      </div>
                      <div className="space-y-2">
                          <h2 className="text-2xl font-bold text-gray-800">Payment</h2>
                          <p className="text-gray-500 text-sm">Manage payments and receipts</p>
                      </div>
                  </CardContent>
                </Card>
             </div>
           </div>
        )}

        {/* View: Billing Content */}
        {viewMode === 'billing' && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">Invoice Management</h1>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Button
                    onClick={() => setIsCreateInvoiceOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm"
                  >
                    <Plus className="h-4 w-4" /> Create New Invoice
                  </Button>
                  <Button
                    onClick={() => setIsInvoiceStatusOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm"
                  >
                    <Activity className="h-4 w-4" /> Invoice Status
                  </Button>
                  <Button
                    onClick={handleSearchAndEdit} 
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm"
                  >
                    <Search className="h-4 w-4" /> Search, Edit and Delete Invoice
                  </Button>
                </div>
                
                <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500">
                    <p>Click the buttons above to manage your invoices and their statuses.</p>
                </div>
           </div>
        )}

        {/* View: Payment Intermediate Step */}
        {viewMode === 'payment' && (
             <div className="flex flex-col h-[60vh] items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h1 className="text-3xl font-bold text-gray-800 mb-10">Payment Management</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
                    <Card 
                        className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-500 bg-white group" 
                        onClick={() => setViewMode('payment-receipts')}
                    >
                        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[250px]">
                            <div className="p-4 bg-blue-100 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                <Receipt className="h-10 w-10" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold text-gray-800">Payment Receipt</h2>
                                <p className="text-gray-500 text-sm">Generate receipts for payments</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card 
                      className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-500 bg-white group" 
                      onClick={() => setIsPaymentDetailsOpen(true)}
                    >
                      <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[250px]">
                          <div className="p-4 bg-blue-100 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                              <ClipboardList className="h-12 w-12" />
                          </div>
                          <div className="space-y-2">
                              <h2 className="text-2xl font-bold text-gray-800">Payment Details</h2>
                              <p className="text-gray-500 text-sm">View all payment records by customer</p>
                          </div>
                      </CardContent>
                    </Card>
                </div>
             </div>
        )}

        {/* View: Payment Receipt Options */}
        {viewMode === 'payment-receipts' && (
            <PaymentReceiptOptions 
                onInvoicePayment={() => setViewMode('payment-receipt-management')}
                onAdvancePayment={() => setViewMode('advance-payment-management')}
            />
        )}
        
        {/* View: Full Payment Receipt Management Component */}
        {viewMode === 'payment-receipt-management' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <PaymentReceipt />
            </div>
        )}

        {/* View: Advance Payment Management */}
        {viewMode === 'advance-payment-management' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <h1 className="text-3xl font-bold text-gray-800">Advance Payment Management</h1>
                 </div>
                 
                 <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6">
                   <Button
                     onClick={() => setIsAdvancePaymentOpen(true)}
                     className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm"
                   >
                     <Plus className="h-4 w-4" /> Create New Advance Payment Receipt
                   </Button>
                   <Button
                     onClick={() => setIsSearchAdvancePaymentOpen(true)}
                     className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm"
                   >
                     <Search className="h-4 w-4" /> Search, Edit and Delete Advance Payment Receipt
                   </Button>
                 </div>
                 
                 <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500">
                     <p>Click the buttons above to create and manage advance payment receipts.</p>
                 </div>
            </div>
        )}

        {/* --- Dialogs --- */}

        {/* Create Invoice Dialog */}
        <Dialog open={isCreateInvoiceOpen} onOpenChange={setIsCreateInvoiceOpen}>
            <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[95vh] p-0 bg-transparent border-none shadow-none">
                 <CreateInvoiceForm onClose={() => setIsCreateInvoiceOpen(false)} onSuccess={handleInvoiceSuccess} />
            </DialogContent>
        </Dialog>

        {/* Search Invoice Dialog */}
        <Dialog open={isSearchInvoiceOpen} onOpenChange={setIsSearchInvoiceOpen}>
            <DialogContent className="max-w-[900px] w-full max-h-[90vh] overflow-y-auto p-0 bg-transparent border-none shadow-none">
                 <SearchInvoice />
            </DialogContent>
        </Dialog>

        {/* Invoice Status Management Dialog */}
        <Dialog open={isInvoiceStatusOpen} onOpenChange={setIsInvoiceStatusOpen}>
            <DialogContent className="max-w-[900px] w-full max-h-[90vh] overflow-y-auto p-0 bg-transparent border-none shadow-none">
                <InvoiceStatusManagement onClose={() => setIsInvoiceStatusOpen(false)} />
            </DialogContent>
        </Dialog>

        {/* Advance Payment Receipt Dialog */}
        <Dialog open={isAdvancePaymentOpen} onOpenChange={setIsAdvancePaymentOpen}>
            <DialogContent className="max-w-[95vw] md:max-w-4xl w-full p-0 bg-transparent border-none shadow-none">
                <CreateAdvancePaymentReceiptForm onClose={() => setIsAdvancePaymentOpen(false)} onSuccess={handlePaymentSuccess} />
            </DialogContent>
        </Dialog>

        {/* Search Advance Payment Receipt Dialog */}
        <Dialog open={isSearchAdvancePaymentOpen} onOpenChange={setIsSearchAdvancePaymentOpen}>
            <DialogContent className="max-w-[95vw] md:max-w-5xl w-full h-[85vh] p-0 bg-transparent border-none shadow-none flex flex-col">
                <SearchAdvancePaymentReceipt onClose={() => setIsSearchAdvancePaymentOpen(false)} />
            </DialogContent>
        </Dialog>

        {/* Payment Details Form Dialog */}
        <Dialog open={isPaymentDetailsOpen} onOpenChange={setIsPaymentDetailsOpen}>
            <DialogContent className="max-w-[95vw] md:max-w-4xl w-full h-[85vh] p-0 bg-transparent border-none shadow-none flex flex-col">
                <PaymentDetailsForm onClose={() => setIsPaymentDetailsOpen(false)} />
            </DialogContent>
        </Dialog>

      </div>
    </>
  );
};

export default Invoice;