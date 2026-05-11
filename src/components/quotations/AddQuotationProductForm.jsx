import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';

const AddQuotationProductForm = ({ quotationId, type = 'Sale', onSave, onCancel }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dbProducts, setDbProducts] = useState([]);

  // Hardcoded lists to match main form
  const defaultServiceProductNames = ["Civil work coupled with aluminium /glass window / door repair/ modification.", "Dismantling & Transport for relocation", "Inspection & Maintenance", "Installation, Commissioning & Erection.", "Laser Cutting", "Loading Unloading Activities", "Machining", "Packaging services", "Planting", "Powder Coating", "Reair & modification.", "Undertake AMC (Annual Maint Contract) - Manpower, with -without implied resourse supply", "Water pneumatic pipe le installation -with control panel automation / loto arragement."];
  const defaultSaleProductNames = ["Barrigation", "Bench", "Blower", "Boom Lifter", "Brackets", "Cage Bin", "Cage Box", "Car lift", "Cupboard", "Duct", "Fencing", "Foldable Pallet", "Foldable Skids", "Forklift", "Grating", "Ladder -Fix", "Ladder -Movable", "Metal Box", "Mechanical Fixtures", "Pallets", "PEB Structure", "Pressjob", "Railing", "Sale BRM - As It Is", "Scaffolding", "Sizzer lift", "Skids", "Storage Rack", "Table", "Tool Lifting Tackle", "Tray", "Trolley", "Trolley Hydraulic Lifting"];
  
  const [units] = useState(['Nos', 'Kg', 'Mtr', 'Ltr', 'Set', 'Pcs', 'Job']);

  const [formData, setFormData] = useState({
    product_name: '',
    unit: '',
    quantity: '',
    price_for_one: '',
  });

  const [gst, setGst] = useState({ cgst: false, sgst: false, igst: false });
  const [calculated, setCalculated] = useState({
    total_price: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    total_price_with_gst: 0,
  });

  useEffect(() => {
    fetchDbProducts();
  }, []);

  const fetchDbProducts = async () => {
    try {
      const { data, error } = await supabase.from('product_list').select('*');
      if (error) throw error;
      setDbProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const getProductOptions = () => {
    const defaultList = type === 'Sale' ? defaultSaleProductNames : defaultServiceProductNames;
    const dbList = dbProducts
      .filter(p => p.type === type)
      .map(p => p.product_name);
    
    return [...new Set([...defaultList, ...dbList])].sort();
  };

  useEffect(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.price_for_one) || 0;
    const total_price = qty * price;

    let cgst_amount = 0;
    let sgst_amount = 0;
    let igst_amount = 0;

    if (gst.cgst) cgst_amount = total_price * 0.09;
    if (gst.sgst) sgst_amount = total_price * 0.09;
    if (gst.igst) igst_amount = total_price * 0.18;

    const total_price_with_gst = total_price + cgst_amount + sgst_amount + igst_amount;

    setCalculated({
      total_price,
      cgst_amount,
      sgst_amount,
      igst_amount,
      total_price_with_gst
    });
  }, [formData.quantity, formData.price_for_one, gst]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleGstChange = (type) => {
    setGst(prev => {
      const newState = { ...prev, [type]: !prev[type] };
      if (type === 'igst' && newState.igst) {
        newState.cgst = false;
        newState.sgst = false;
      } else if ((type === 'cgst' || type === 'sgst') && (newState.cgst || newState.sgst)) {
        newState.igst = false;
      }
      return newState;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_name || !formData.unit || !formData.quantity || !formData.price_for_one) {
        toast({ title: "Validation Error", description: "Please fill all fields.", variant: "destructive" });
        return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('quotation_items')
        .insert({
          quotation_id: quotationId,
          type: type, // Inherit type from parent quotation
          product_name: formData.product_name,
          unit: formData.unit,
          quantity: parseFloat(formData.quantity),
          price_for_one: parseFloat(formData.price_for_one),
          total_price: calculated.total_price,
          cgst: calculated.cgst_amount,
          sgst: calculated.sgst_amount,
          igst: calculated.igst_amount,
          total_price_with_gst: calculated.total_price_with_gst
        });

      if (error) throw error;

      onSave(); // Trigger parent refresh
      toast({ title: 'Success', description: 'Product added successfully.' });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({ title: 'Error', description: 'Failed to add item.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="product_name">Product Name</Label>
          <Select 
            value={formData.product_name} 
            onValueChange={(val) => handleSelectChange('product_name', val)}
          >
            <SelectTrigger>
                <SelectValue placeholder="Select Product" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
                {getProductOptions().map((name, i) => (
                    <SelectItem key={`${name}-${i}`} value={name}>{name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Select 
            value={formData.unit} 
            onValueChange={(val) => handleSelectChange('unit', val)}
          >
            <SelectTrigger>
                <SelectValue placeholder="Select Unit" />
            </SelectTrigger>
            <SelectContent>
                {units.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" type="number" step="0.01" value={formData.quantity} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price_for_one">Price for One</Label>
          <Input id="price_for_one" type="number" step="0.01" value={formData.price_for_one} onChange={handleChange} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label>GST Selection</Label>
        <div className="flex gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="add_cgst" checked={gst.cgst} onCheckedChange={() => handleGstChange('cgst')} />
            <Label htmlFor="add_cgst">CGST (9%)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="add_sgst" checked={gst.sgst} onCheckedChange={() => handleGstChange('sgst')} />
            <Label htmlFor="add_sgst">SGST (9%)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="add_igst" checked={gst.igst} onCheckedChange={() => handleGstChange('igst')} />
            <Label htmlFor="add_igst">IGST (18%)</Label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-md">
        <div>
          <Label className="text-xs text-gray-500">Total Price (excl. GST)</Label>
          <div className="font-semibold">₹{calculated.total_price.toFixed(2)}</div>
        </div>
        <div>
           <Label className="text-xs text-gray-500">Total Price (incl. GST)</Label>
           <div className="font-bold text-lg text-primary">₹{calculated.total_price_with_gst.toFixed(2)}</div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Product
        </Button>
      </DialogFooter>
    </form>
  );
};

export default AddQuotationProductForm;