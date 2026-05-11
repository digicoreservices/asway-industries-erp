import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Edit2, X, Calendar as CalendarIcon } from 'lucide-react';
import useClientManagement from '@/hooks/useClientManagement';
import EditManufacturingForm from './EditManufacturingForm';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const SearchManufacturing = ({ onClose }) => {
  const [searchType, setSearchType] = useState('All');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  
  // Search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  
  const [mfgSearch, setMfgSearch] = useState('');
  const [showMfgSuggestions, setShowMfgSuggestions] = useState(false);
  const [mfgNumbers, setMfgNumbers] = useState([]);
  
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const { clients } = useClientManagement();
  const { toast } = useToast();

  useEffect(() => {
    const fetchMfgNumbers = async () => {
      try {
        const { data, error } = await supabase.from('manufacturing').select('manufacturing_number');
        if (!error && data) {
          setMfgNumbers(data.map(d => d.manufacturing_number));
        }
      } catch (err) {
        console.error('Error fetching mfg numbers:', err);
      }
    };
    fetchMfgNumbers();
  }, []);

  const filteredCustomers = clients?.filter(c => 
    c.customer_name?.toLowerCase().includes(customerSearch.toLowerCase())
  ) || [];

  const filteredMfgNumbers = mfgNumbers.filter(n => 
    n.toLowerCase().includes(mfgSearch.toLowerCase())
  );

  const handleSearch = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('manufacturing')
        .select(`
          *,
          customers(customer_name),
          work_orders(work_order_number)
        `);

      if (searchType === 'Customer Name') {
        if (!selectedCustomerId) {
          throw new Error('Please select a customer.');
        }
        query = query.eq('customer_id', selectedCustomerId);
      } else if (searchType === 'Manufacturing Details Number') {
        if (!mfgSearch) {
          throw new Error('Please enter a manufacturing number.');
        }
        query = query.eq('manufacturing_number', mfgSearch);
      } else if (searchType === 'Search between two dates') {
        if (!fromDate || !toDate) {
          throw new Error('Please select both From and To dates.');
        }
        query = query.gte('manufacturing_date', format(fromDate, 'yyyy-MM-dd')).lte('manufacturing_date', format(toDate, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;

      if (error) throw error;
      setResults(data || []);
      
      if (data.length === 0) {
        toast({
          title: "No results",
          description: "No manufacturing records found for the selected criteria.",
        });
      }
    } catch (error) {
      console.error('Error searching manufacturing:', error);
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setIsEditing(true);
  };

  const formatDateString = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd-MM-yyyy');
    } catch {
      return dateString;
    }
  };

  const handleClose = () => {
    setSearchType('All');
    setResults([]);
    setCustomerSearch('');
    setSelectedCustomerId(null);
    setMfgSearch('');
    setFromDate(null);
    setToDate(null);
    if (onClose) {
      onClose();
    }
  };

  if (isEditing && editingRecord) {
    return (
      <EditManufacturingForm 
        record={editingRecord} 
        onBack={() => {
          setIsEditing(false);
          handleSearch(); // Refresh data after edit
        }} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Manufacturing Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-6">
            <div className="md:col-span-3 space-y-2">
              <Label>Select option</Label>
              <Select value={searchType} onValueChange={(val) => {
                setSearchType(val);
                setResults([]);
              }}>
                <SelectTrigger className="bg-white text-gray-900">
                  <SelectValue placeholder="Select search type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Customer Name">Customer Name</SelectItem>
                  <SelectItem value="Manufacturing Details Number">Manufacturing Details Number</SelectItem>
                  <SelectItem value="Search between two dates">Search between two dates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {searchType === 'Customer Name' && (
              <div className="md:col-span-5 space-y-2 relative">
                <Label>Customer Name</Label>
                <Input
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerSuggestions(true);
                    setSelectedCustomerId(null);
                  }}
                  onFocus={() => setShowCustomerSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                  placeholder="Type to search customers..."
                  className="text-gray-900"
                />
                {showCustomerSuggestions && customerSearch && filteredCustomers.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto top-[70px]">
                    {filteredCustomers.map(c => (
                      <li 
                        key={c.id} 
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900"
                        onClick={() => {
                          setCustomerSearch(c.customer_name);
                          setSelectedCustomerId(c.id);
                          setShowCustomerSuggestions(false);
                        }}
                      >
                        {c.customer_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {searchType === 'Manufacturing Details Number' && (
              <div className="md:col-span-5 space-y-2 relative">
                <Label>Manufacturing Details Number</Label>
                <Input
                  value={mfgSearch}
                  onChange={(e) => {
                    setMfgSearch(e.target.value);
                    setShowMfgSuggestions(true);
                  }}
                  onFocus={() => setShowMfgSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowMfgSuggestions(false), 200)}
                  placeholder="Type to search number..."
                  className="text-gray-900"
                />
                {showMfgSuggestions && mfgSearch && filteredMfgNumbers.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto top-[70px]">
                    {filteredMfgNumbers.map(n => (
                      <li 
                        key={n} 
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900"
                        onClick={() => {
                          setMfgSearch(n);
                          setShowMfgSuggestions(false);
                        }}
                      >
                        {n}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {searchType === 'Search between two dates' && (
              <>
                <div className="md:col-span-2 space-y-2">
                  <Label>From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal text-gray-900",
                          !fromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fromDate ? format(fromDate, "dd-MM-yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={setFromDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal text-gray-900",
                          !toDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {toDate ? format(toDate, "dd-MM-yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={setToDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div className="md:col-span-4 flex space-x-2">
              <Button 
                onClick={handleSearch} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Show
              </Button>
              <Button 
                onClick={handleClose}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
            </div>
          </div>

          {results.length > 0 && (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manufacturing Details Number</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Manufacturing Details Date</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.manufacturing_number}</TableCell>
                      <TableCell>{record.customers?.customer_name || 'N/A'}</TableCell>
                      <TableCell>{formatDateString(record.manufacturing_date)}</TableCell>
                      <TableCell className="text-right">₹{record.selling_price?.toLocaleString() || '0'}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleEdit(record)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchManufacturing;