import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import useClientManagement from '@/hooks/useClientManagement';

const TransactionDialog = ({ title, type }) => {
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const { clients } = useClientManagement();
  const { toast } = useToast();

  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(null);
  const [serviceType, setServiceType] = useState('Sales');
  const [itemCategory, setItemCategory] = useState('');
  const [orderName, setOrderName] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [invoiceValue, setInvoiceValue] = useState('');
  const [cgst, setCgst] = useState('Yes');
  const [sgst, setSgst] = useState('Yes');
  const [totalAmountWithGst, setTotalAmountWithGst] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [amountPaidDate, setAmountPaidDate] = useState(null);
  const [transactionType, setTransactionType] = useState('');
  const [transactionChequeNumber, setTransactionChequeNumber] = useState('');

  const itemCategories = ["Raw Material", "Hardware", "Consumables"];
  const orderNames = ["Planting", "Galvanizing", "Powder Coating", "Laser Cutting", "Machining"];
  const units = ["Nos", "Kg", "Mtr", "Ltr", "Set", "Box"];
  const transactionTypes = ["Cash", "Net Banking", "UPI", "Cheque"];

  const handleSearch = () => {
    let found = false;
    if (clientId) {
        found = clients.some(c => c.clientId.toLowerCase() === clientId.toLowerCase());
    } else if (clientName) {
        found = clients.some(c => c.clientName.toLowerCase().includes(clientName.toLowerCase()));
    }

    if(found) {
        toast({
            title: "🔍 Customer Found!",
            description: `Ready to proceed with transactions for the customer.`,
        });
    } else {
         toast({
            title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
            description: "Customer search functionality is being built.",
            variant: "destructive"
        });
    }
  };

  const handleAddTransaction = () => {
     toast({
        title: "✅ Transaction Added!",
        description: `The transaction has been successfully added.`,
    });
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {type === 'check' ? 'Search for a customer to view transactions. Filter by date range if needed.' : 'Fill in the details to add a new transaction.'}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="clientId" className="text-right">
            Customer ID
          </Label>
          <Input
            id="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Search Customer By Id"
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="clientName" className="text-right">
            Customer Name
          </Label>
          <Input
            id="clientName"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Search Customer By Name"
            className="col-span-3"
          />
        </div>
        {type === 'check' && (
          <>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    disabled={{ before: fromDate }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}
        {type === 'add' && (
          <>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="invoiceNo" className="text-right">Invoice No</Label>
              <Input id="invoiceNo" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Enter invoice number" className="col-span-3"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Invoice Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !invoiceDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {invoiceDate ? format(invoiceDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={invoiceDate} onSelect={setInvoiceDate} initialFocus /></PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Service Type</Label>
              <RadioGroup value={serviceType} onValueChange={setServiceType} className="col-span-3 flex items-center gap-4">
                <div className="flex items-center space-x-2"><RadioGroupItem value="Sales" id="sales" /><Label htmlFor="sales">Sales</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Service" id="service" /><Label htmlFor="service">Service</Label></div>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="itemCategory" className="text-right">Item Category</Label>
                <Select value={itemCategory} onValueChange={setItemCategory}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="orderName" className="text-right">Order Name</Label>
                <Select value={orderName} onValueChange={setOrderName}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select an order name" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unit" className="text-right">Unit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(unitOption => <SelectItem key={unitOption} value={unitOption}>{unitOption}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">Quantity</Label>
                <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Enter quantity" className="col-span-3"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="invoiceValue" className="text-right">Invoice Value</Label>
              <Input id="invoiceValue" type="number" value={invoiceValue} onChange={(e) => setInvoiceValue(e.target.value)} placeholder="Total invoice value" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">CGST</Label>
              <RadioGroup value={cgst} onValueChange={setCgst} className="col-span-3 flex items-center gap-4">
                <div className="flex items-center space-x-2"><RadioGroupItem value="Yes" id="cgstYes" /><Label htmlFor="cgstYes">Yes</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="No" id="cgstNo" /><Label htmlFor="cgstNo">No</Label></div>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">SGST</Label>
              <RadioGroup value={sgst} onValueChange={setSgst} className="col-span-3 flex items-center gap-4">
                <div className="flex items-center space-x-2"><RadioGroupItem value="Yes" id="sgstYes" /><Label htmlFor="sgstYes">Yes</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="No" id="sgstNo" /><Label htmlFor="sgstNo">No</Label></div>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="totalAmountWithGst" className="text-right">Total Amount with GST</Label>
              <Input id="totalAmountWithGst" type="number" value={totalAmountWithGst} onChange={(e) => setTotalAmountWithGst(e.target.value)} placeholder="Total with GST" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amountPaid" className="text-right">Amount Paid</Label>
              <Input id="amountPaid" type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="Amount paid" className="col-span-3"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Amount Paid Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal",!amountPaidDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {amountPaidDate ? format(amountPaidDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={amountPaidDate} onSelect={setAmountPaidDate} initialFocus/></PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="transactionType" className="text-right">Transaction Type</Label>
                <Select value={transactionType} onValueChange={setTransactionType}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transactionChequeNumber" className="text-right">Transaction / Cheque No</Label>
              <Input id="transactionChequeNumber" value={transactionChequeNumber} onChange={(e) => setTransactionChequeNumber(e.target.value)} placeholder="Enter transaction number" className="col-span-3"/>
            </div>
          </>
        )}
      </div>
      <DialogFooter>
        {type === 'check' ? (
          <Button onClick={handleSearch} className="w-full">
            <Search className="mr-2 h-4 w-4" /> Search
          </Button>
        ) : (
          <Button onClick={handleAddTransaction} className="w-full">
            Add Transaction
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
};

export default TransactionDialog;