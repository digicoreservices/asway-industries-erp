import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import useClientManagement from '@/hooks/useClientManagement';
import { Search, Plus, Trash2 } from 'lucide-react';

const EditClientForm = ({ onClientUpdated, clientId, clients }) => {
    const { updateClient } = useClientManagement();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingClient, setEditingClient] = useState(null);
    const [formData, setFormData] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);

    useEffect(() => {
        const client = clientId ? clients.find(c => c.id === clientId) : null;
        if (client) {
            setEditingClient(client);
            setSearchTerm('');
            setShowSuggestions(false);
        } else {
            setEditingClient(null);
        }
    }, [clientId, clients]);

    const filteredSuggestions = useMemo(() => {
        if (!searchTerm) return [];
        const lowercasedFilter = searchTerm.toLowerCase();
        return clients.filter(client =>
            (client.customer_name && client.customer_name.toLowerCase().includes(lowercasedFilter)) ||
            (client.customer_id && client.customer_id.toLowerCase().includes(lowercasedFilter))
        ).slice(0, 5);
    }, [clients, searchTerm]);

    useEffect(() => {
        if (editingClient) {
            // Robustly parse contact persons
            let initialContacts = editingClient.contact_persons;
            if (typeof initialContacts === 'string') {
                try { initialContacts = JSON.parse(initialContacts); } catch(e) {}
            }
            if (initialContacts && typeof initialContacts === 'object' && !Array.isArray(initialContacts)) {
                initialContacts = Object.values(initialContacts);
            }
            if (!Array.isArray(initialContacts)) {
                initialContacts = [];
            }
            
            if (initialContacts.length === 0 && (editingClient.contact_person || editingClient.contact_number || editingClient.email)) {
                initialContacts = [{
                    name: editingClient.contact_person || '',
                    number: editingClient.contact_number || '',
                    email: editingClient.email || ''
                }];
            } else if (initialContacts.length === 0) {
                initialContacts = [{ name: '', number: '', email: '' }];
            }

            // Robustly parse departments dynamically without any limits
            let initialDepts = [];
            let rawDepts = editingClient.departments;
            
            if (typeof rawDepts === 'string') {
                try { rawDepts = JSON.parse(rawDepts); } catch(e) {}
            }

            if (Array.isArray(rawDepts) && rawDepts.length > 0) {
                initialDepts = rawDepts.map(dept => ({
                    department_name: dept.department_name || dept.departmentName || '',
                    user_name: dept.user_name || dept.userName || '',
                    contact_number: dept.contact_number || dept.contactNumber || '',
                    email: dept.email || dept.emailId || ''
                }));
            } else if (rawDepts && typeof rawDepts === 'object' && Object.keys(rawDepts).length > 0) {
                initialDepts = Object.values(rawDepts).map(dept => ({
                    department_name: dept.department_name || dept.departmentName || '',
                    user_name: dept.user_name || dept.userName || '',
                    contact_number: dept.contact_number || dept.contactNumber || '',
                    email: dept.email || dept.emailId || ''
                }));
            } else {
                // Fallback to legacy fields, dynamically checking for any number of departments
                const maxDeptIndex = Math.max(
                    5,
                    ...Object.keys(editingClient).map(key => {
                        const match = key.match(/^department_name_(\d+)$/) || key.match(/^user(\d+)$/);
                        return match ? parseInt(match[1], 10) : 0;
                    })
                );

                for (let i = 1; i <= maxDeptIndex; i++) {
                    if (editingClient[`department_name_${i}`] || editingClient[`user${i}`]) {
                        initialDepts.push({
                            department_name: editingClient[`department_name_${i}`] || '',
                            user_name: editingClient[`user${i}`] || '',
                            contact_number: editingClient[`contact_number_dept${i}`] || '',
                            email: editingClient[`email_dept${i}`] || ''
                        });
                    }
                }
            }

            if (initialDepts.length === 0) {
                initialDepts = [];
            }

            setFormData({
                id: editingClient.id,
                customer_id: editingClient.customer_id,
                customer_name: editingClient.customer_name,
                contact_number: editingClient.contact_number || '',
                email: editingClient.email || '',
                address: editingClient.address || '',
                contactPersons: initialContacts,
                departments: initialDepts
            });
        } else {
            setFormData(null);
        }
    }, [editingClient]);

    const handleSuggestionClick = (client) => {
        setEditingClient(client);
        setSearchTerm('');
        setShowSuggestions(false);
        toast({ title: "Customer Selected", description: `Now editing ${client.customer_name}.` });
    };
    
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setShowSuggestions(true);
    };

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
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

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!formData || isSubmitting) return;
        
        setIsSubmitting(true);
        if (!formData.customer_name || formData.customer_name.trim() === '') {
            toast({ title: "Validation Error", description: `Customer Name is required.`, variant: "destructive" });
            setIsSubmitting(false);
            return;
        }

        const payload = {
            id: formData.id,
            customer_id: formData.customer_id,
            customer_name: formData.customer_name,
            contact_number: formData.contact_number,
            email: formData.email,
            address: formData.address,
            contact_persons: formData.contactPersons,
            departments: formData.departments,
            contact_person: formData.contactPersons[0]?.name || ''
        };

        // Reset legacy columns
        for(let i = 1; i <= 5; i++) {
            payload[`department_name_${i}`] = '';
            payload[`user${i}`] = '';
            payload[`contact_number_dept${i}`] = '';
            payload[`email_dept${i}`] = '';
        }

        // Repopulate legacy columns for the first 5 backward compatibility
        formData.departments.forEach((dept, index) => {
            if (index < 5) {
                const i = index + 1;
                payload[`department_name_${i}`] = dept.department_name;
                payload[`user${i}`] = dept.user_name;
                payload[`contact_number_dept${i}`] = dept.contact_number;
                payload[`email_dept${i}`] = dept.email;
            }
        });

        const { error } = await updateClient(formData.id, payload);
        if (!error) {
            toast({ title: "Success", description: "Customer updated successfully." });
            if (onClientUpdated) {
                onClientUpdated();
            }
        } else {
            toast({ title: "Error", description: "Failed to update customer.", variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const getLabelText = (key) => {
      if (key === 'customer_id') return 'Customer ID';
      if (key === 'customer_name') return 'Customer Name';
      if (key === 'contact_number') return 'Contact Number';
      if (key === 'email') return 'Email';
      return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const mainFields = ['customer_id', 'customer_name', 'contact_number', 'email'];

    return (
        <DialogContent className="sm:max-w-[600px] md:max-w-[700px]">
            <DialogHeader>
                <DialogTitle>Edit Customer</DialogTitle>
                <DialogDescription>
                    Search for a customer or click the edit icon on a customer card to begin.
                </DialogDescription>
            </DialogHeader>
            {!editingClient ? (
                <div className="relative py-4">
                    <div className="flex items-center gap-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            placeholder="Search Customer Name or ID..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="pl-10 text-gray-900"
                        />
                    </div>
                     {searchTerm && showSuggestions && filteredSuggestions.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg"
                        >
                            <ul className="max-h-60 overflow-y-auto">
                                {filteredSuggestions.map((client) => (
                                <li
                                    key={client.id}
                                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSuggestionClick(client)}
                                >
                                    {client.customer_name} ({client.customer_id})
                                </li>
                                ))}
                            </ul>
                        </motion.div>
                    )}
                </div>
            ) : (
                <form onSubmit={handleUpdate}>
                    {formData && (
                        <>
                            <div className="max-h-[60vh] overflow-y-auto p-1 py-4">
                                <div className="grid gap-4 mb-4">
                                    {mainFields.map((key) => (
                                        <div key={key} className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor={key} className="text-right capitalize">
                                                {getLabelText(key)}
                                                {key === 'customer_name' && <span className="text-red-500 ml-1">*</span>}
                                            </Label>
                                            <Input
                                                id={key}
                                                type={key === 'email' ? 'email' : key === 'contact_number' ? 'tel' : 'text'}
                                                value={formData[key]}
                                                onChange={handleChange}
                                                className="col-span-3 text-gray-900"
                                                readOnly={key === 'customer_id'}
                                            />
                                        </div>
                                    ))}
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="address" className="text-right capitalize">
                                            Address
                                        </Label>
                                        <Textarea
                                            id="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            className="col-span-3 min-h-[80px] text-gray-900"
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
                                        <Label className="text-base font-semibold">Departments</Label>
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
                                                    <div className="grid w-full items-center gap-1.5 md:col-span-2">
                                                        <Label htmlFor={`dept-name-${index}`} className="text-xs">Department Name</Label>
                                                        <Input 
                                                            id={`dept-name-${index}`} 
                                                            value={dept.department_name} 
                                                            onChange={(e) => handleDepartmentChange(index, 'department_name', e.target.value)} 
                                                            placeholder="e.g., IT, HR, Production"
                                                            className="text-gray-900"
                                                        />
                                                    </div>
                                                    <div className="grid w-full items-center gap-1.5">
                                                        <Label htmlFor={`user-${index}`} className="text-xs">User Name</Label>
                                                        <Input 
                                                            id={`user-${index}`} 
                                                            value={dept.user_name} 
                                                            onChange={(e) => handleDepartmentChange(index, 'user_name', e.target.value)} 
                                                            className="text-gray-900"
                                                        />
                                                    </div>
                                                    <div className="grid w-full items-center gap-1.5">
                                                        <Label htmlFor={`contact-${index}`} className="text-xs">Contact Number</Label>
                                                        <Input 
                                                            id={`contact-${index}`} 
                                                            value={dept.contact_number} 
                                                            onChange={(e) => handleDepartmentChange(index, 'contact_number', e.target.value)} 
                                                            className="text-gray-900"
                                                        />
                                                    </div>
                                                    <div className="grid w-full items-center gap-1.5 md:col-span-2">
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
                                <Button type="button" variant="outline" onClick={() => { setEditingClient(null); setSearchTerm(''); }}>Back to Search</Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                                    {isSubmitting ? 'Updating...' : 'Update Customer'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </form>
            )}
        </DialogContent>
    );
};

export default EditClientForm;