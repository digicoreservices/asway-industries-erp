import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import AddOIForm from '@/components/items/AddOIForm';
import DeleteItemForm from '@/components/items/DeleteItemForm';

const OutputMaterialOI = () => {
  const { toast } = useToast();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isDeleteFormOpen, setIsDeleteFormOpen] = useState(false);

  const handleNotImplemented = () => {
    toast({
      title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
      description: "We're working hard to bring this feature to you soon.",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="p-4 md:p-6"
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Output Material OI</CardTitle>
          <div className="flex gap-2">
            <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
              <DialogTrigger asChild>
                <Button>Add New</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <AddOIForm onClose={() => setIsAddFormOpen(false)} />
              </DialogContent>
            </Dialog>
            <Dialog open={isDeleteFormOpen} onOpenChange={setIsDeleteFormOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Delete</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DeleteItemForm itemType="Output Item" onClose={() => setIsDeleteFormOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700">No Output Material OIs Found</h3>
            <p className="text-gray-500 mt-2">Get started by adding a new Order Invoice.</p>
            <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
              <DialogTrigger asChild>
                <Button className="mt-4">
                  Add Output Material OI
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <AddOIForm onClose={() => setIsAddFormOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default OutputMaterialOI;