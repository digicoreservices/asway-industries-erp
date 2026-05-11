import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import useClientManagement from '@/hooks/useClientManagement';

const AddOIForm = ({ onClose }) => {
  const { toast } = useToast();
  const { clients } = useClientManagement();
  const [oiId, setOiId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [cgst, setCgst] = useState('Yes');
  const [sgst, setSgst] = useState('Yes');
  const [totalAmount, setTotalAmount] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [transactionChequeNumber, setTransactionChequeNumber] = useState('');

  const categories = ["Sales", "Services"];
  const manufacturedFrom = ["Metal", "Non metal"];
  const types = ["Cupboard", "Table", "Trolley"];
  const units = ["Nos", "Kg", "Mtr", "Ltr", "Set", "Box"];
  const transactionTypes = ["Cash", "Net Banking", "UPI", "Cheque"];

  const handleSave = () => {
    if (!oiId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in the Output Material ID.',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Item Saved!',
      description: `Item with Output Material ID #${oiId} has been saved.`,
    });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>Add New Output Material</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-3">
          <div className="space-y-2">
            <Label htmlFor="oiId">Output Material ID</Label>
            <Input
              id="oiId"
              placeholder="Enter Output Material ID"
              value={oiId}
              onChange={(e) => setOiId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Client Name</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => <SelectItem key={client.id} value={client.clientName}>{client.clientName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
           <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              placeholder="Enter Invoice Number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>
           <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !invoiceDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {invoiceDate ? format(invoiceDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={invoiceDate} onSelect={setInvoiceDate} initialFocus /></PopoverContent>
              </Popover>
            </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Manufactured From</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {manufacturedFrom.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Types</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {types.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select a unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Rate</Label>
            <Input
              id="rate"
              type="number"
              placeholder="Enter rate"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
           <div className="space-y-2">
            <Label>CGST</Label>
            <RadioGroup value={cgst} onValueChange={setCgst} className="flex items-center gap-4">
              <div className="flex items-center space-x-2"><RadioGroupItem value="Yes" id="cgstYesOi" /><Label htmlFor="cgstYesOi">Yes</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="No" id="cgstNoOi" /><Label htmlFor="cgstNoOi">No</Label></div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>SGST</Label>
            <RadioGroup value={sgst} onValueChange={setSgst} className="flex items-center gap-4">
              <div className="flex items-center space-x-2"><RadioGroupItem value="Yes" id="sgstYesOi" /><Label htmlFor="sgstYesOi">Yes</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="No" id="sgstNoOi" /><Label htmlFor="sgstNoOi">No</Label></div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalAmount">Total Amount</Label>
            <Input
              id="totalAmount"
              type="number"
              placeholder="Enter total amount"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger>
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {transactionTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="transactionChequeNumber">Transaction / Cheque Number</Label>
            <Input
              id="transactionChequeNumber"
              placeholder="Enter transaction or cheque number"
              value={transactionChequeNumber}
              onChange={(e) => setTransactionChequeNumber(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">Close</Button>
          <Button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default AddOIForm;