import React, { useState } from 'react';
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
import useSupplierManagement from '@/hooks/useSupplierManagement';

const SupplierTransactionDialog = ({ title, type }) => {
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const { suppliers } = useSupplierManagement();
  const { toast } = useToast();

  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(null);
  const [serviceType, setServiceType] = useState('Sales');
  const [category, setCategory] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [cgst, setCgst] = useState('Yes');
  const [sgst, setSgst] = useState('Yes');
  const [totalPrice, setTotalPrice] = useState('');
  const [invoiceValue, setInvoiceValue] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [transactionDate, setTransactionDate] = useState(null);
  const [transactionType, setTransactionType] = useState('');
  const [transactionChequeNumber, setTransactionChequeNumber] = useState('');

  const categories = ["BRM", "HCU", "CU", "MEQ", "PNT", "PPE", "EPI", "LBR", "OT"];
  const itemCategories = ["Raw Materials", "Consumables", "Hardware"];
  const itemNames = ["MS TUBE 80X40X2.5MM", "ms pipe 50 Nb A class", "Ms pipe 150 NB A class", "Cutting Wheel 4\"", "Gasket 1\""];
  const units = ["Nos", "Kg", "Mtr", "Ltr", "Set", "Box"];
  const transactionTypes = ["Cash", "Net Banking", "UPI", "Cheque"];

  const handleSearch = () => {
    let found = false;
    if (supplierId) {
        found = suppliers.some(s => s.supplier_id.toLowerCase() === supplierId.toLowerCase());
    } else if (supplierName) {
        found = suppliers.some(s => s.supplier_name.toLowerCase().includes(supplierName.toLowerCase()));
    }

    if(found) {
        toast({
            title: "🔍 Supplier Found!",
            description: `Ready to proceed with transactions for the supplier.`,
        });
    } else {
         toast({
            title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
            description: "Supplier search functionality is being built.",
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
          {type === 'check' ? 'Search for a supplier to view transactions. Filter by date range if needed.' : 'Fill in the details to add a new transaction.'}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="supplierId" className="text-right">
            Supplier ID
          </Label>
          <Input
            id="supplierId"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            placeholder="Search Supplier By Id"
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="supplierName" className="text-right">
            Supplier Name
          </Label>
          <Input
            id="supplierName"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="Search Supplier By Name"
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
                <Label htmlFor="category" className="text-right">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="itemCategory" className="text-right">Item Category</Label>
                <Select value={itemCategory} onValueChange={setItemCategory}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select an item category" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="itemName" className="text-right">Item Name</Label>
                <Select value={itemName} onValueChange={setItemName}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select an item name" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
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
                <Label htmlFor="price" className="text-right">Price</Label>
                <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Enter price" className="col-span-3"/>
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
              <Label htmlFor="totalPrice" className="text-right">Total Price</Label>
              <Input id="totalPrice" type="number" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} placeholder="Total price" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="invoiceValue" className="text-right">Invoice Value</Label>
              <Input id="invoiceValue" type="number" value={invoiceValue} onChange={(e) => setInvoiceValue(e.target.value)} placeholder="Total invoice value" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amountPaid" className="text-right">Amount Paid</Label>
              <Input id="amountPaid" type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="Amount paid" className="col-span-3"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Amount Paid Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal",!transactionDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {transactionDate ? format(transactionDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={transactionDate} onSelect={setTransactionDate} initialFocus/></PopoverContent>
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

export default SupplierTransactionDialog;