import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Download, Save, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const EditManufacturingForm = ({ record, onBack }) => {
  const [formData, setFormData] = useState({
    manufacturing_number: record.manufacturing_number || '',
    manufacturing_date: record.manufacturing_date || '',
    selling_price: record.selling_price || 0,
    basic_price: record.basic_price || 0,
    profit: record.profit || 0,
    labour_cost: record.labour_cost || 0,
    overhead_expenses: record.overhead_expenses || 0,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const pdfRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('manufacturing')
        .update({
          manufacturing_date: formData.manufacturing_date,
          selling_price: parseFloat(formData.selling_price),
          basic_price: parseFloat(formData.basic_price),
          profit: parseFloat(formData.profit),
          labour_cost: parseFloat(formData.labour_cost),
          overhead_expenses: parseFloat(formData.overhead_expenses),
        })
        .eq('id', record.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Manufacturing record updated successfully.",
      });
      onBack();
    } catch (error) {
      console.error('Error updating record:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePDF = async () => {
    if (!pdfRef.current) return;
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Manufacturing_${formData.manufacturing_number}.pdf`);
      
      toast({
        title: "PDF Generated",
        description: "The manufacturing record has been saved as a PDF.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: "destructive",
        title: "PDF Generation Failed",
        description: "There was an error generating the PDF.",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Edit Manufacturing Record</CardTitle>
        <Button 
          onClick={onBack}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </CardHeader>
      
      <CardContent>
        <div ref={pdfRef} className="space-y-4 p-4 bg-white rounded-md border">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Record Details: {formData.manufacturing_number}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Manufacturing Number</Label>
              <Input 
                value={formData.manufacturing_number} 
                disabled 
                className="bg-gray-100 text-gray-900" 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Customer</Label>
              <Input 
                value={record.customers?.customer_name || 'N/A'} 
                disabled 
                className="bg-gray-100 text-gray-900" 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Manufacturing Date</Label>
              <Input 
                type="date"
                name="manufacturing_date"
                value={formData.manufacturing_date}
                onChange={handleChange}
                className="text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label>Basic Price (₹)</Label>
              <Input 
                type="number"
                name="basic_price"
                value={formData.basic_price}
                onChange={handleChange}
                className="text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label>Labour Cost (₹)</Label>
              <Input 
                type="number"
                name="labour_cost"
                value={formData.labour_cost}
                onChange={handleChange}
                className="text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label>Overhead Expenses (₹)</Label>
              <Input 
                type="number"
                name="overhead_expenses"
                value={formData.overhead_expenses}
                onChange={handleChange}
                className="text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label>Profit (₹)</Label>
              <Input 
                type="number"
                name="profit"
                value={formData.profit}
                onChange={handleChange}
                className="text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label>Selling Price (₹)</Label>
              <Input 
                type="number"
                name="selling_price"
                value={formData.selling_price}
                onChange={handleChange}
                className="text-gray-900 font-bold"
              />
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between border-t p-6">
        <Button 
          onClick={onBack}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
        <div className="flex space-x-2">
          <Button 
            onClick={handleSavePDF}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Save as PDF
          </Button>
          <Button 
            onClick={handleUpdate}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Update
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default EditManufacturingForm;