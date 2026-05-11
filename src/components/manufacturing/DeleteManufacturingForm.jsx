import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Search, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const DeleteManufacturingForm = ({ onSuccess, onClose }) => {
  const { toast } = useToast();
  
  // Visibility State for fallback if onClose is not provided
  const [isVisible, setIsVisible] = useState(true);

  // Form State
  const [selectedOption, setSelectedOption] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  
  // Autocomplete State
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef(null);

  // Data State
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Delete State
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle clicking outside of suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions based on input
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchTerm || selectedOption === 'All') {
        setSuggestions([]);
        return;
      }

      if (selectedOption === 'Customer Name') {
        const { data } = await supabase
          .from('customers')
          .select('id, customer_name')
          .ilike('customer_name', `%${searchTerm}%`)
          .limit(10);
        setSuggestions(data || []);
      } else if (selectedOption === 'Manufacturing Details Number') {
        const { data } = await supabase
          .from('manufacturing')
          .select('id, manufacturing_number')
          .ilike('manufacturing_number', `%${searchTerm}%`)
          .limit(10);
        setSuggestions(data || []);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, selectedOption]);

  const handleSelectOption = (value) => {
    setSelectedOption(value);
    setSearchTerm('');
    setSelectedEntityId(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setRecords([]);
    setHasSearched(false);
  };

  const handleSelectSuggestion = (suggestion) => {
    if (selectedOption === 'Customer Name') {
      setSearchTerm(suggestion.customer_name);
      setSelectedEntityId(suggestion.id);
    } else {
      setSearchTerm(suggestion.manufacturing_number);
      setSelectedEntityId(suggestion.manufacturing_number); // For MFG number, we can query by the number itself
    }
    setShowSuggestions(false);
  };

  const fetchRecords = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      let query = supabase.from('manufacturing').select('*, customers(customer_name)');

      if (selectedOption === 'Customer Name') {
        if (!selectedEntityId) {
           toast({ variant: "destructive", title: "Error", description: "Please select a valid customer from the suggestions." });
           setLoading(false);
           return;
        }
        query = query.eq('customer_id', selectedEntityId);
      } else if (selectedOption === 'Manufacturing Details Number') {
        if (!searchTerm) {
           toast({ variant: "destructive", title: "Error", description: "Please enter a manufacturing number." });
           setLoading(false);
           return;
        }
        query = query.eq('manufacturing_number', selectedEntityId || searchTerm);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching records:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch manufacturing records.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset internal state
    setSelectedOption('');
    setSearchTerm('');
    setSelectedEntityId(null);
    setRecords([]);
    setHasSearched(false);
    setSuggestions([]);
    setShowSuggestions(false);
    setRecordToDelete(null);

    // Call parent onClose if provided to close the dialog/form
    if (typeof onClose === 'function') {
      onClose();
    } else {
      // Fallback: hide the component entirely if no parent handler is provided
      setIsVisible(false);
    }
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('manufacturing')
        .delete()
        .eq('id', recordToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Manufacturing record deleted successfully.",
      });
      
      // Refresh the table
      await fetchRecords();
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete the record.",
      });
    } finally {
      setIsDeleting(false);
      setRecordToDelete(null);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="space-y-6 p-6 border rounded-lg bg-card shadow-sm max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Trash2 className="h-6 w-6 text-blue-600" />
          Delete Manufacturing Record
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-4 space-y-2">
          <label className="text-sm font-medium text-gray-700">Select option</label>
          <Select value={selectedOption} onValueChange={handleSelectOption}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Customer Name">Customer Name</SelectItem>
              <SelectItem value="Manufacturing Details Number">Manufacturing Details Number</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedOption && selectedOption !== 'All' && (
          <div className="md:col-span-5 space-y-2 relative" ref={suggestionRef}>
            <label className="text-sm font-medium text-gray-700">
              {selectedOption === 'Customer Name' ? 'Search Customer' : 'Search Manufacturing No.'}
            </label>
            <div className="relative">
              <Input
                placeholder={`Type to search...`}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedEntityId(null);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full pl-9"
              />
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            </div>

            {/* Autocomplete Suggestions */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
                >
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      {selectedOption === 'Customer Name' 
                        ? suggestion.customer_name 
                        : suggestion.manufacturing_number}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="md:col-span-3 flex items-center gap-2 pb-0">
          <Button 
            onClick={fetchRecords} 
            disabled={!selectedOption || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Show
          </Button>
          <Button 
            onClick={handleClose}
            variant="outline"
            className="bg-blue-600 hover:bg-blue-700 text-white border-0 flex-1"
            type="button"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {hasSearched && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-6 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Manufacturing Details Number</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Manufacturing Details Date</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.manufacturing_number}</TableCell>
                        <TableCell>{record.customers?.customer_name || 'Unknown'}</TableCell>
                        <TableCell>
                          {record.manufacturing_date 
                            ? format(new Date(record.manufacturing_date), 'dd-MM-yyyy')
                            : format(new Date(record.created_at), 'dd-MM-yyyy')}
                        </TableCell>
                        <TableCell>₹{Number(record.selling_price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setRecordToDelete(record.id)}
                            title="Delete Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the manufacturing record
              from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={() => setRecordToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeleteManufacturingForm;