import React, { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const AddUnitDialog = ({ isOpen, onClose, onUnitAdded }) => {
  const { toast } = useToast();
  const [unitName, setUnitName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddUnit = async () => {
    const trimmedUnit = unitName.trim();
    
    if (!trimmedUnit) {
      toast({
        title: "Validation Error",
        description: "Please enter a unit name.",
        variant: "destructive"
      });
      return;
    }

    setIsAdding(true);

    try {
      // Call the parent callback to add the unit
      if (onUnitAdded) {
        onUnitAdded(trimmedUnit);
      }

      toast({
        title: "Unit Added",
        description: `Unit "${trimmedUnit}" has been added successfully.`
      });

      // Reset and close
      setUnitName('');
      onClose();
    } catch (error) {
      console.error('Error adding unit:', error);
      toast({
        title: "Error",
        description: "Failed to add unit. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setUnitName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Unit</DialogTitle>
          <DialogDescription>
            Enter a new unit of measurement to add to the dropdown list.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-2">
            <Label htmlFor="unitName">Unit Name</Label>
            <Input
              id="unitName"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              placeholder="e.g., Pcs, Ton, Dozen"
              className="text-gray-900"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUnit();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAddUnit}
            disabled={isAdding}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isAdding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Unit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddUnitDialog;