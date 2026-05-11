import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const EditQuotationProductForm = ({ item, onSave, onCancel }) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

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

  // Initialize form data immediately when item prop is provided
  useEffect(() => {
    if (item) {
      setFormData({
        product_name: item.product_name || '',
        unit: item.unit || '',
        quantity: item.quantity?.toString() || '',
        price_for_one: item.price_for_one?.toString() || '',
      });

      setGst({
        cgst: (item.cgst || 0) > 0,
        sgst: (item.sgst || 0) > 0,
        igst: (item.igst || 0) > 0,
      });
    }
  }, [item]);

  // Recalculate totals when form data or GST changes
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

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleGstChange = (gstType) => {
    setGst(prev => {
      const newState = { ...prev, [gstType]: !prev[gstType] };
      // If IGST is selected, deselect CGST and SGST
      if (gstType === 'igst' && newState.igst) {
        newState.cgst = false;
        newState.sgst = false;
      }
      // If CGST or SGST is selected, deselect IGST
      if ((gstType === 'cgst' || gstType === 'sgst') && newState[gstType]) {
        newState.igst = false;
      }
      return newState;
    });
  };

  const handleSave = async () => {
    if (!formData.product_name || !formData.quantity || !formData.price_for_one) {
      toast({ 
        title: 'Validation Error', 
        description: 'Please fill in Product Name, Quantity, and Price for One.', 
        variant: 'destructive' 
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('quotation_items')
        .update({
          product_name: formData.product_name,
          unit: formData.unit,
          quantity: parseFloat(formData.quantity),
          price_for_one: parseFloat(formData.price_for_one),
          total_price: calculated.total_price,
          cgst: calculated.cgst_amount,
          sgst: calculated.sgst_amount,
          igst: calculated.igst_amount,
          total_price_with_gst: calculated.total_price_with_gst
        })
        .eq('id', item.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Product updated successfully.' });
      onSave();
    } catch (error) {
      console.error('Error updating product:', error);
      toast({ title: 'Error', description: 'Failed to update product.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Go Back button */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div>
          <h3 className="text-lg font-semibold">Edit Product</h3>
          <p className="text-sm text-muted-foreground">Modify the product details below</p>
        </div>
        <Button 
          type="button" 
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          onClick={onCancel}
        >
          <ArrowLeft size={14} /> Go Back
        </Button>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="product_name">
            Product Name <span className="text-red-500">*</span>
          </Label>
          <Input 
            id="product_name" 
            value={formData.product_name} 
            onChange={handleInputChange}
            className="bg-white text-gray-900"
            placeholder="Enter product name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Input 
            id="unit" 
            value={formData.unit} 
            onChange={handleInputChange}
            className="bg-white text-gray-900"
            placeholder="e.g., Piece, Kg, Meter"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">
            Quantity <span className="text-red-500">*</span>
          </Label>
          <Input 
            id="quantity" 
            type="number" 
            step="0.01" 
            value={formData.quantity} 
            onChange={handleInputChange}
            className="bg-white text-gray-900"
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price_for_one">
            Price for One <span className="text-red-500">*</span>
          </Label>
          <Input 
            id="price_for_one" 
            type="number" 
            step="0.01" 
            value={formData.price_for_one} 
            onChange={handleInputChange}
            className="bg-white text-gray-900"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* GST Selection */}
      <div className="space-y-2">
        <Label>GST Selection</Label>
        <div className="flex gap-4">
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="cgst" 
              checked={gst.cgst} 
              onChange={() => handleGstChange('cgst')}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="cgst" className="cursor-pointer">CGST (9%)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="sgst" 
              checked={gst.sgst} 
              onChange={() => handleGstChange('sgst')}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="sgst" className="cursor-pointer">SGST (9%)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="igst" 
              checked={gst.igst} 
              onChange={() => handleGstChange('igst')}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="igst" className="cursor-pointer">IGST (18%)</Label>
          </div>
        </div>
      </div>

      {/* Calculated Totals */}
      <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md border">
        <div>
          <Label className="text-xs text-gray-500">Total Price (excl. GST)</Label>
          <div className="font-semibold text-gray-900">₹{calculated.total_price.toFixed(2)}</div>
        </div>
        <div>
          <Label className="text-xs text-gray-500">Total GST Amount</Label>
          <div className="font-semibold text-gray-900">
            ₹{(calculated.cgst_amount + calculated.sgst_amount + calculated.igst_amount).toFixed(2)}
          </div>
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-gray-500">Total Price (incl. GST)</Label>
          <div className="font-bold text-xl text-blue-600">₹{calculated.total_price_with_gst.toFixed(2)}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="button" 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default EditQuotationProductForm;