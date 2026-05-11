import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AddClientForm = ({ onClientAdded }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    contactNumber: '',
    email: '',
    address: '',
    contactPersons: [{ name: '', number: '', email: '' }],
    departments: [],
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleContactChange = (index, field, value) => {
    const updatedContacts = [...formData.contactPersons];
    updatedContacts[index][field] = value;
    setFormData((prev) => ({ ...prev, contactPersons: updatedContacts }));
  };

  const addContact = () => {
    setFormData((prev) => ({
      ...prev,
      contactPersons: [...prev.contactPersons, { name: '', number: '', email: '' }],
    }));
  };

  const removeContact = (index) => {
    const updatedContacts = formData.contactPersons.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, contactPersons: updatedContacts }));
  };

  const handleDepartmentChange = (index, field, value) => {
    const updatedDepartments = [...formData.departments];
    updatedDepartments[index][field] = value;
    setFormData((prev) => ({ ...prev, departments: updatedDepartments }));
  };

  const addDepartment = () => {
    setFormData((prev) => ({
      ...prev,
      departments: [...prev.departments, { department_name: '', user_name: '', contact_number: '', email: '' }],
    }));
  };

  const removeDepartment = (index) => {
    const updatedDepartments = formData.departments.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, departments: updatedDepartments }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      const payload = {
        customer_id: `CUST-${Date.now()}`,
        customer_name: formData.customerName,
        contact_number: formData.contactNumber,
        email: formData.email,
        address: formData.address,
        contact_persons: formData.contactPersons,
        departments: formData.departments,
        // Keep backward compatibility
        contact_person: formData.contactPersons[0]?.name || '',
        created_at: new Date().toISOString(),
      };

      // Legacy support for the first 5 departments (if any are added)
      formData.departments.forEach((dept, index) => {
        if (index < 5) {
          const i = index + 1;
          payload[`department_name_${i}`] = dept.department_name || '';
          payload[`department${i}`] = dept.department_name || '';
          payload[`user${i}`] = dept.user_name || '';
          payload[`contact_number_dept${i}`] = dept.contact_number || '';
          payload[`email_dept${i}`] = dept.email || '';
        }
      });

      const { data, error } = await supabase
        .from('customers')
        .insert([payload])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        toast({
          title: "Success",
          description: "Customer added successfully",
        });
        if (onClientAdded) onClientAdded(data[0]);
        
        setFormData({
          customerName: '',
          contactNumber: '',
          email: '',
          address: '',
          contactPersons: [{ name: '', number: '', email: '' }],
          departments: [],
        });
      }
    } catch (error) {
      console.error("Error adding customer:", error);
      toast({
        title: "Error",
        description: "Failed to add customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[600px] md:max-w-[700px]">
      <DialogHeader>
        <DialogTitle>Add New Customer</DialogTitle>
        <DialogDescription>Fill in the customer details below.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="max-h-[70vh] overflow-y-auto p-1 py-4">
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">
                Customer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={handleChange}
                required
                className="text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactNumber">
                Contact Number
              </Label>
              <Input
                id="contactNumber"
                type="tel"
                value={formData.contactNumber}
                onChange={handleChange}
                className="text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">
                Address
              </Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={handleChange}
                className="min-h-[80px] text-gray-900"
              />
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <Label className="text-base font-semibold">Contact Persons</Label>
              <Button type="button" variant="outline" size="sm" onClick={addContact}>
                <Plus size={16} className="mr-1" /> Add Contact
              </Button>
            </div>
            
            <div className="space-y-4">
              {formData.contactPersons.length === 0 && (
                <div className="text-sm text-gray-500 italic p-4 text-center border rounded-md bg-gray-50/50">
                  No contact persons added.
                </div>
              )}
              {formData.contactPersons.map((contact, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 border rounded-md bg-gray-50/50 relative"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">Contact {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeContact(index)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`contact-name-${index}`} className="text-xs">Contact Person</Label>
                      <Input
                        id={`contact-name-${index}`}
                        value={contact.name}
                        onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                        className="text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`contact-number-${index}`} className="text-xs">Contact Number</Label>
                      <Input
                        id={`contact-number-${index}`}
                        value={contact.number}
                        onChange={(e) => handleContactChange(index, 'number', e.target.value)}
                        className="text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`contact-email-${index}`} className="text-xs">Email</Label>
                      <Input
                        id={`contact-email-${index}`}
                        type="email"
                        value={contact.email}
                        onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                        className="text-gray-900"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <Label className="text-base font-semibold">Departments (Optional)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addDepartment}>
                <Plus size={16} className="mr-1" /> Add Department
              </Button>
            </div>
            
            <div className="space-y-4">
              {formData.departments.length === 0 && (
                <div className="text-sm text-gray-500 italic p-4 text-center border rounded-md bg-gray-50/50">
                  No departments added. Click "Add Department" to include one.
                </div>
              )}
              {formData.departments.map((dept, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 border rounded-md mb-3 bg-gray-50/50 relative"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">Department {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeDepartment(index)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`dept-name-${index}`} className="text-xs">Department Name</Label>
                      <Input
                        id={`dept-name-${index}`}
                        value={dept.department_name}
                        onChange={(e) => handleDepartmentChange(index, 'department_name', e.target.value)}
                        placeholder="e.g., IT, HR, Production"
                        className="text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`user-${index}`} className="text-xs">User Name</Label>
                      <Input
                        id={`user-${index}`}
                        value={dept.user_name}
                        onChange={(e) => handleDepartmentChange(index, 'user_name', e.target.value)}
                        className="text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`contact-${index}`} className="text-xs">Contact Number</Label>
                      <Input
                        id={`contact-${index}`}
                        value={dept.contact_number}
                        onChange={(e) => handleDepartmentChange(index, 'contact_number', e.target.value)}
                        className="text-gray-900"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`email-${index}`} className="text-xs">Email</Label>
                      <Input
                        id={`email-${index}`}
                        type="email"
                        value={dept.email}
                        onChange={(e) => handleDepartmentChange(index, 'email', e.target.value)}
                        className="text-gray-900"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Customer'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default AddClientForm;