import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import useSupplierManagement from '@/hooks/useSupplierManagement';
import { Search, Plus, Trash2, Edit2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const EditSupplierForm = ({ onSupplierUpdated, supplierId, suppliers }) => {
    const { updateSupplier } = useSupplierManagement();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [formData, setFormData] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [department, setDepartment] = useState('');
    const [user, setUser] = useState('');
    const [departmentContactNumber, setDepartmentContactNumber] = useState('');
    const [departmentEmail, setDepartmentEmail] = useState('');
    const [departmentsAndUsers, setDepartmentsAndUsers] = useState([]);
    const [editingDeptIndex, setEditingDeptIndex] = useState(null);

    const resetFormState = useCallback(() => {
        setSearchTerm('');
        setEditingSupplier(null);
        setFormData(null);
        setShowSuggestions(false);
        setDepartment('');
        setUser('');
        setDepartmentContactNumber('');
        setDepartmentEmail('');
        setDepartmentsAndUsers([]);
        setEditingDeptIndex(null);
    }, []);

    useEffect(() => {
        const supplier = supplierId ? suppliers.find(s => s.id === supplierId) : null;
        if (supplier) {
            setEditingSupplier(supplier);
            setShowSuggestions(false);
        } else {
            resetFormState();
        }
    }, [supplierId, suppliers, resetFormState]);

    useEffect(() => {
        if (editingSupplier) {
            let initialContacts = editingSupplier.contact_persons || [];
            
            if (initialContacts.length === 0 && (editingSupplier.contact_person || editingSupplier.contact_number || editingSupplier.email)) {
                initialContacts = [{
                    name: editingSupplier.contact_person || '',
                    number: editingSupplier.contact_number || '',
                    email: editingSupplier.email || ''
                }];
            } else if (initialContacts.length === 0) {
                initialContacts = [{ name: '', number: '', email: '' }];
            }

            setFormData({
                id: editingSupplier.id,
                supplierId: editingSupplier.supplier_id,
                supplierName: editingSupplier.supplier_name,
                contactNumber: editingSupplier.contact_number || '',
                email: editingSupplier.email || '',
                address: editingSupplier.address || '',
                contactPersons: initialContacts,
            });
            setDepartmentsAndUsers(editingSupplier.departments || []);
        } else {
            setFormData(null);
            setDepartmentsAndUsers([]);
        }
    }, [editingSupplier]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setShowSuggestions(true);
    };

    const handleSuggestionClick = (supplier) => {
        setEditingSupplier(supplier);
        setSearchTerm(supplier.supplier_name);
        setShowSuggestions(false);
        toast({ title: "Supplier Selected", description: `Now editing ${supplier.supplier_name}.` });
    };

    const suggestionList = useMemo(() => {
        if (!searchTerm) return [];
        const lowercasedFilter = searchTerm.toLowerCase();
        return suppliers.filter(supplier =>
            (supplier.supplier_name && supplier.supplier_name.toLowerCase().includes(lowercasedFilter)) ||
            (supplier.supplier_id && supplier.supplier_id.toLowerCase().includes(lowercasedFilter))
        );
    }, [suppliers, searchTerm]);

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

    const handleAddOrUpdateDepartmentUser = () => {
        const newDeptUser = { department, user, contactNumber: departmentContactNumber, emailId: departmentEmail };
        if (editingDeptIndex !== null) {
            const updatedDepts = [...departmentsAndUsers];
            updatedDepts[editingDeptIndex] = newDeptUser;
            setDepartmentsAndUsers(updatedDepts);
            setEditingDeptIndex(null);
        } else {
            setDepartmentsAndUsers([...departmentsAndUsers, newDeptUser]);
        }
        setDepartment('');
        setUser('');
        setDepartmentContactNumber('');
        setDepartmentEmail('');
    };

    const handleEditDepartmentUser = (index) => {
        const deptToEdit = departmentsAndUsers[index];
        setDepartment(deptToEdit.department || '');
        setUser(deptToEdit.user || '');
        setDepartmentContactNumber(deptToEdit.contactNumber || '');
        setDepartmentEmail(deptToEdit.emailId || '');
        setEditingDeptIndex(index);
    };

    const handleRemoveDepartmentUser = (index) => {
        setDepartmentsAndUsers(departmentsAndUsers.filter((_, i) => i !== index));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (isSubmitting || !formData) return;
        setIsSubmitting(true);

        const requiredFields = ['supplierName'];
        for (const field of requiredFields) {
            if (!formData[field] || formData[field].trim() === '') {
                toast({ title: "Validation Error", description: `Field "${field.replace(/([A-Z])/g, ' $1').trim()}" is required.`, variant: "destructive" });
                setIsSubmitting(false);
                return;
            }
        }

        const supplierData = {
            id: formData.id,
            supplier_id: formData.supplierId,
            supplier_name: formData.supplierName,
            contact_number: formData.contactNumber,
            email: formData.email,
            address: formData.address,
            contact_persons: formData.contactPersons,
            contact_person: formData.contactPersons[0]?.name || '',
            departments: departmentsAndUsers,
        };

        const success = await updateSupplier(supplierData);
        if (success) {
            toast({
                title: "Success",
                description: `Supplier "${supplierData.supplier_name}" updated successfully.`,
            });
            if (onSupplierUpdated) {
                onSupplierUpdated();
            }
        }
        setIsSubmitting(false);
    };
    
    const getLabelText = (key) => {
      if (key === 'supplierId') return 'Supplier ID';
      if (key === 'supplierName') return 'Supplier Name';
      if (key === 'contactNumber') return 'Contact Number';
      if (key === 'email') return 'Email';
      return key.replace(/([A-Z0-9])/g, ' $1').trim();
    };

    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Edit Supplier</DialogTitle>
                <DialogDescription>
                    Search for a supplier or click the edit icon on a supplier card to begin.
                </DialogDescription>
            </DialogHeader>
            {!editingSupplier ? (
                <div className="relative py-4">
                    <div className="flex gap-2 items-center">
                        <Search className="absolute left-3 h-5 w-5 text-gray-400" />
                        <Input
                            placeholder="Search Supplier Name or ID..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                            className="pl-10 text-gray-900"
                        />
                    </div>
                    {showSuggestions && searchTerm && suggestionList.length > 0 && (
                        <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
                            {suggestionList.map(supplier => (
                                <div
                                    key={supplier.id}
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleSuggestionClick(supplier)}
                                >
                                    <p className="font-semibold">{supplier.supplier_name}</p>
                                    <p className="text-sm text-gray-500">{supplier.supplier_id}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <form onSubmit={handleUpdate}>
                    <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
                        {formData && (
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="supplierId" className="text-right">Supplier ID</Label>
                                    <Input id="supplierId" value={formData.supplierId} onChange={handleChange} className="col-span-3 text-gray-900" readOnly />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="supplierName" className="text-right">Supplier Name <span className="text-red-500">*</span></Label>
                                    <Input id="supplierName" value={formData.supplierName} onChange={handleChange} className="col-span-3 text-gray-900" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="contactNumber" className="text-right">Contact Number</Label>
                                    <Input 
                                        id="contactNumber" 
                                        type="tel"
                                        placeholder="Enter contact number"
                                        value={formData.contactNumber} 
                                        onChange={handleChange} 
                                        className="col-span-3 text-gray-900" 
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="email" className="text-right">Email</Label>
                                    <Input 
                                        id="email" 
                                        type="email"
                                        placeholder="Enter email address"
                                        value={formData.email} 
                                        onChange={handleChange} 
                                        className="col-span-3 text-gray-900" 
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="address" className="text-right">Address</Label>
                                    <Textarea id="address" value={formData.address} onChange={handleChange} className="col-span-3 min-h-[80px] text-gray-900" />
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
                                    <Label className="text-base font-semibold block mb-4">Departments</Label>
                                    <div className="grid grid-cols-4 items-center gap-4 mb-2">
                                        <Label htmlFor="department" className="text-right">Department Name</Label>
                                        <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} className="col-span-3 text-gray-900" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4 mb-2">
                                        <Label htmlFor="user" className="text-right">User</Label>
                                        <Input id="user" value={user} onChange={(e) => setUser(e.target.value)} className="col-span-3 text-gray-900" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4 mb-2">
                                        <Label htmlFor="departmentContactNumber" className="text-right">Contact Number</Label>
                                        <Input id="departmentContactNumber" value={departmentContactNumber} onChange={(e) => setDepartmentContactNumber(e.target.value)} className="col-span-3 text-gray-900" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4 mb-4">
                                        <Label htmlFor="departmentEmail" className="text-right">Email Id</Label>
                                        <Input id="departmentEmail" type="email" value={departmentEmail} onChange={(e) => setDepartmentEmail(e.target.value)} className="col-span-3 text-gray-900" />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button type="button" onClick={handleAddOrUpdateDepartmentUser} size="sm">
                                            {editingDeptIndex !== null ? <><Edit2 className="h-4 w-4 mr-2" /> Update</> : <><Plus className="h-4 w-4 mr-2" /> Add</>}
                                        </Button>
                                    </div>

                                    {departmentsAndUsers.length > 0 && (
                                        <div className="mt-4">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Department</TableHead>
                                                        <TableHead>User</TableHead>
                                                        <TableHead>Contact</TableHead>
                                                        <TableHead>Email</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {departmentsAndUsers.map((item, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{item.department}</TableCell>
                                                            <TableCell>{item.user}</TableCell>
                                                            <TableCell>{item.contactNumber}</TableCell>
                                                            <TableCell>{item.emailId}</TableCell>
                                                            <TableCell className="text-right">
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => handleEditDepartmentUser(index)}>
                                                                    <Edit2 className="h-4 w-4 text-blue-500" />
                                                                </Button>
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveDepartmentUser(index)}>
                                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="mt-4 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setEditingSupplier(null)}>Back to Search</Button>
                        <Button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Updating...' : 'Update Supplier'}
                        </Button>
                    </DialogFooter>
                </form>
            )}
        </DialogContent>
    );
};

export default EditSupplierForm;