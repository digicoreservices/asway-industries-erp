import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search } from 'lucide-react';

const CheckStockBySupplierForm = ({ onClose }) => {
  const { toast } = useToast();
  
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [stockData, setStockData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSuppliers = async () => {
        const { data, error } = await supabase
            .from('suppliers')
            .select('id, supplier_name')
            .order('supplier_name', { ascending: true });

        if (error) {
            console.error('Error fetching suppliers:', error);
            toast({ title: 'Error fetching suppliers', description: error.message, variant: 'destructive' });
        } else {
            setSuppliers(data || []);
        }
    };
    fetchSuppliers();
  }, [toast]);

  const filteredSuppliers = useMemo(() => {
      if (!searchTerm) return [];
      const lowerSearch = searchTerm.toLowerCase();
      return suppliers.filter(s => 
          s.supplier_name.toLowerCase().includes(lowerSearch)
      ).slice(0, 5);
  }, [suppliers, searchTerm]);

  const handleSearchChange = (e) => {
      setSearchTerm(e.target.value);
      setSelectedSupplier(null);
      setShowSuggestions(true);
      setStockData([]);
  };

  const handleSuggestionClick = (supplier) => {
      setSearchTerm(supplier.supplier_name);
      setSelectedSupplier(supplier);
      setShowSuggestions(false);
  };

  const handleCheckStock = async () => {
      if (!selectedSupplier) {
          toast({ title: 'Please select a supplier', description: 'Search and select a supplier from the list.', variant: 'destructive' });
          return;
      }

      setIsLoading(true);
      setStockData([]);

      try {
          // Filter out OTHER_CHARGES at database query level
          const { data, error } = await supabase
              .from('items')
              .select('*')
              .eq('supplier_id', selectedSupplier.id)
              .neq('category', 'OTHER_CHARGES');

          if (error) throw error;

          // Process Data: Group by Item Name, Category, and Unit
          const grouped = {};
          
          data.forEach(item => {
              const key = `${item.item_name}-${item.category}-${item.unit}`;
              
              if (!grouped[key]) {
                  grouped[key] = {
                      itemName: item.item_name,
                      category: item.category || 'N/A',
                      unit: item.unit || 'N/A',
                      totalQuantity: 0
                  };
              }
              
              const qty = parseFloat(item.quantity) || 0;
              const used = parseFloat(item.used_quantity) || 0;
              const available = qty - used;
              
              grouped[key].totalQuantity += available;
          });

          const results = Object.values(grouped);

          setStockData(results);
          
          if (results.length === 0) {
              toast({ title: 'No Stock Found', description: 'No items found for this supplier.' });
          } else {
              toast({ title: 'Success', description: `Found ${results.length} item(s).` });
          }

      } catch (err) {
          console.error("Error checking stock:", err);
          toast({ title: 'Error', description: 'Failed to fetch stock data.', variant: 'destructive' });
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
      <Card className="border-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Check Stock by Supplier</CardTitle>
          <Button type="button" onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
            Go Back
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto pr-3">
          
            <div className="relative">
                <Label htmlFor="supplier-search">Supplier Name</Label>
                <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        id="supplier-search"
                        placeholder="Search Supplier..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="pl-9 bg-white text-gray-900"
                        autoComplete="off"
                    />
                </div>
                
                {showSuggestions && filteredSuppliers.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg"
                    >
                        <ul className="max-h-60 overflow-y-auto">
                            {filteredSuppliers.map((supplier) => (
                                <li
                                    key={supplier.id}
                                    className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                                    onClick={() => handleSuggestionClick(supplier)}
                                >
                                    {supplier.supplier_name}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </div>

            <div className="flex justify-end">
                 <Button onClick={handleCheckStock} disabled={isLoading || !selectedSupplier} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Check Stock
                 </Button>
            </div>

            {stockData.length > 0 && (
                <div className="border rounded-md mt-4 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead>Item Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stockData.map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{row.itemName}</TableCell>
                                    <TableCell>{row.category}</TableCell>
                                    <TableCell>{row.unit}</TableCell>
                                    <TableCell className="text-right">{row.totalQuantity.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
            
            {stockData.length === 0 && !isLoading && selectedSupplier && !showSuggestions && searchTerm && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg mt-4">
                     Click "Check Stock" to view items for {selectedSupplier.supplier_name}.
                </div>
            )}

        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CheckStockBySupplierForm;