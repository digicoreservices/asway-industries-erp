import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import useSupplierManagement from '@/hooks/useSupplierManagement';

const AddSupplierForm = ({ onSupplierAdded, isOpen }) => {
  const { addSupplier } = useSupplierManagement();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    supplier_name: '',
    contactNumber: '',
    email: '',
    address: '',
    contactPersons: [{ name: '', number: '', email: '' }],
    departments: [{ department: '', user: '', contactNumber: '', emailId: '' }],
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
      departments: [...prev.departments, { department: '', user: '', contactNumber: '', emailId: '' }],
    }));
  };

  const removeDepartment = (index) => {
    const updatedDepartments = formData.departments.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, departments: updatedDepartments }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    if (!formData.supplier_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Supplier Name is required.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = {
        supplier_name: formData.supplier_name,
        contact_number: formData.contactNumber,
        email: formData.email,
        address: formData.address,
        contact_persons: formData.contactPersons,
        departments: formData.departments,
        contact_person: formData.contactPersons[0]?.name || ''
      };

      // addSupplier now handles UUID and supplier_id generation internally
      const { data: newSupplier, error } = await addSupplier(payload);
      
      if (error) {
        throw error;
      }

      if (newSupplier) {
        toast({
          title: "Success",
          description: `Supplier "${newSupplier.supplier_name}" added successfully.`,
        });

        // Pass the complete supplier object back so it can be selected immediately
        if (onSupplierAdded) {
          onSupplierAdded(newSupplier);
        }
        
        // Reset form
        setFormData({
          supplier_name: '',
          contactNumber: '',
          email: '',
          address: '',
          contactPersons: [{ name: '', number: '', email: '' }],
          departments: [{ department: '', user: '', contactNumber: '', emailId: '' }],
        });
      }
    } catch (err) {
      console.error("Submission error:", err);
      toast({
        title: "Failed to add supplier",
        description: err.message || "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[600px] md:max-w-[700px]">
      <DialogHeader>
        <DialogTitle>Add New Supplier</DialogTitle>
        <DialogDescription>Fill in the supplier details below.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="max-h-[70vh] overflow-y-auto p-1 py-4">
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_name">
                Supplier Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="supplier_name"
                value={formData.supplier_name}
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
                placeholder="Enter contact number"
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
                placeholder="Enter email address"
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
            <div className="flex justify-between items-center mb-2">
              <Label className="text-base font-semibold">Departments</Label>
              <Button type="button" variant="outline" size="sm" onClick={addDepartment}>
                <Plus size={16} className="mr-1" /> Add Department
              </Button>
            </div>
            {formData.departments.map((dept, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 border rounded-md mb-3 bg-gray-50/50"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-sm">Department {index + 1}</span>
                  {formData.departments.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeDepartment(index)}
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`dept-${index}`} className="text-xs">Department Name</Label>
                    <Input
                      id={`dept-${index}`}
                      value={dept.department}
                      onChange={(e) => handleDepartmentChange(index, 'department', e.target.value)}
                      className="text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`user-${index}`} className="text-xs">User</Label>
                    <Input
                      id={`user-${index}`}
                      value={dept.user}
                      onChange={(e) => handleDepartmentChange(index, 'user', e.target.value)}
                      className="text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`contact-${index}`} className="text-xs">Contact Number</Label>
                    <Input
                      id={`contact-${index}`}
                      value={dept.contactNumber}
                      onChange={(e) => handleDepartmentChange(index, 'contactNumber', e.target.value)}
                      className="text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`email-${index}`} className="text-xs">Email</Label>
                    <Input
                      id={`email-${index}`}
                      type="email"
                      value={dept.emailId}
                      onChange={(e) => handleDepartmentChange(index, 'emailId', e.target.value)}
                      className="text-gray-900"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Supplier'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default AddSupplierForm;