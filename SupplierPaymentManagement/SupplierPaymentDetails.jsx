import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useSupplierManagement from '@/hooks/useSupplierManagement';
import { motion, AnimatePresence } from 'framer-motion';

const SupplierPaymentDetails = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { suppliers, loading } = useSupplierManagement();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const suggestionRef = useRef(null);

  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSupplierSelect = (supplier) => {
    setSelectedSupplier(supplier);
    setSearchTerm(supplier.supplier_name);
    setShowSuggestions(false);
  };

  const handleShowClick = () => {
    if (!selectedSupplier) {
      toast({
        title: "Supplier Required",
        description: "Please select a supplier to view details.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Loading Details",
      description: `🚧 Fetching payment details for ${selectedSupplier.supplier_name}. This feature isn't fully implemented yet! 🚀`,
    });
  };

  return (
    <div className="py-8 px-6 max-w-5xl mx-auto space-y-6">
      <Helmet>
        <title>Supplier Payment Details | Asway ERP</title>
        <meta name="description" content="View supplier payment details" />
      </Helmet>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Supplier Payment Details
        </h1>
        <Button 
          onClick={() => navigate('/supplier-payment')} 
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border border-gray-200 shadow-sm mt-6">
          <CardContent className="p-8">
            <div className="max-w-md mx-auto space-y-6">
              <div className="space-y-2 relative" ref={suggestionRef}>
                <Label htmlFor="supplier-search" className="text-gray-700 font-medium">Supplier Name</Label>
                <div className="relative">
                  <Input
                    id="supplier-search"
                    type="text"
                    placeholder="Search supplier..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSuggestions(true);
                      if (selectedSupplier && e.target.value !== selectedSupplier.supplier_name) {
                        setSelectedSupplier(null);
                      }
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    autoComplete="off"
                  />
                  {loading && <div className="absolute right-3 top-3 text-xs text-gray-400">Loading...</div>}
                </div>

                <AnimatePresence>
                  {showSuggestions && searchTerm && !selectedSupplier && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
                    >
                      {filteredSuppliers.length > 0 ? (
                        <ul className="py-1">
                          {filteredSuppliers.map((supplier) => (
                            <li
                              key={supplier.id}
                              onClick={() => handleSupplierSelect(supplier)}
                              className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-gray-800 text-sm"
                            >
                              {supplier.supplier_name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No suppliers found
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button 
                onClick={handleShowClick}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg rounded-xl shadow-md transition-all hover:scale-105"
              >
                <Search className="w-5 h-5 mr-2" />
                Show
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SupplierPaymentDetails;