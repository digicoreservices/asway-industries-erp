import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AddRemainingPayment = ({ onClose }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Add Remaining Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="p-6 text-center border rounded-lg bg-gray-50 text-gray-600">
                <p>Payment tracking functionality has been removed from Order Receipts.</p>
                <p className="text-sm mt-2">Please use the Invoices and Payment Receipts modules to track payments.</p>
            </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">Close</Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default AddRemainingPayment;