
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Database, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { migrateItemsToItemsMaster, verifyItemsMasterIntegrity } from '@/lib/migrateItemsToMaster';

const Dashboard = ({ user }) => {
  const { toast } = useToast();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [migrationResults, setMigrationResults] = useState(null);

  // MAINTENANCE TAB VISIBILITY CONTROL
  // Set to true to show the Maintenance tab, false to hide it
  const SHOW_MAINTENANCE_TAB = false;

  const handleMigration = async () => {
    setShowConfirmDialog(false);
    setIsMigrating(true);
    setMigrationResults(null);

    try {
      console.log('🚀 Starting migration from Dashboard...');
      const results = await migrateItemsToItemsMaster();
      
      setMigrationResults(results);
      setMigrationComplete(true);

      toast({
        title: "Migration Successful!",
        description: `Successfully migrated ${results.successfulInserts} items to items_master table. ${results.skipped} items were already present.`,
        variant: "default",
      });

    } catch (error) {
      console.error('❌ Migration failed:', error);
      toast({
        title: "Migration Failed",
        description: error.message || "An error occurred during migration. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    try {
      const integrity = await verifyItemsMasterIntegrity();
      toast({
        title: "Integrity Check Complete",
        description: `Total items: ${integrity.totalItems}. Check console for detailed breakdown.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Integrity Check Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <ErrorBoundary>
      <div className="p-4 md:p-6 bg-gray-50/50 min-h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl text-center"
        >
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className={SHOW_MAINTENANCE_TAB ? "grid w-full grid-cols-2" : "grid w-full grid-cols-1"}>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              {/* MAINTENANCE TAB - Hidden by default. Change SHOW_MAINTENANCE_TAB to true to enable */}
              {SHOW_MAINTENANCE_TAB && (
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="dashboard">
              <motion.div
                key="dashboard-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-6"
              >
                <Card className="overflow-hidden shadow-lg border-none bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-4xl font-extrabold tracking-tight">
                      Welcome, {user?.name || 'User'}!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 pb-8 px-6">
                    <CardDescription className="text-lg text-blue-100 leading-relaxed">
                      Your journey with Asway Industries ERP begins here.
                      We're thrilled to have you on board!
                      Explore the features and streamline your operations with ease.
                    </CardDescription>
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
                      className="mt-8"
                    >
                      <p className="text-sm text-blue-200 italic">
                        "Efficiency is doing things right; effectiveness is doing the right things."
                      </p>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* MAINTENANCE TAB CONTENT - Only rendered when SHOW_MAINTENANCE_TAB is true */}
            {SHOW_MAINTENANCE_TAB && (
              <TabsContent value="maintenance">
                <motion.div
                  key="maintenance-content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mt-6 space-y-6"
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Database className="h-6 w-6 text-blue-600" />
                        <CardTitle>Database Maintenance</CardTitle>
                      </div>
                      <CardDescription>
                        Manage and maintain database integrity
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert className="bg-blue-50 border-blue-200">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-900">Items Master Migration</AlertTitle>
                        <AlertDescription className="text-blue-800">
                          This migration populates the <code className="bg-blue-100 px-1 rounded">items_master</code> table with all items from the product constants library. 
                          It is safe to run multiple times - duplicate items will be automatically skipped.
                        </AlertDescription>
                      </Alert>

                      {migrationResults && (
                        <Alert className={migrationResults.errors.length === 0 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
                          {migrationResults.errors.length === 0 ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          )}
                          <AlertTitle className={migrationResults.errors.length === 0 ? "text-green-900" : "text-yellow-900"}>
                            Migration Results
                          </AlertTitle>
                          <AlertDescription className={migrationResults.errors.length === 0 ? "text-green-800" : "text-yellow-800"}>
                            <div className="space-y-1 mt-2">
                              <p>✅ Total items processed: <strong>{migrationResults.totalProcessed}</strong></p>
                              <p>✅ Successfully inserted: <strong>{migrationResults.successfulInserts}</strong></p>
                              <p>⏭️ Skipped (already exist): <strong>{migrationResults.skipped}</strong></p>
                              <p>❌ Errors: <strong>{migrationResults.errors.length}</strong></p>
                              
                              {Object.keys(migrationResults.itemsByCategory).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-green-300">
                                  <p className="font-semibold mb-1">Items Added by Category:</p>
                                  {Object.entries(migrationResults.itemsByCategory).map(([category, count]) => (
                                    count > 0 && <p key={category} className="text-sm">• {category}: {count} items</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          onClick={() => setShowConfirmDialog(true)}
                          disabled={isMigrating || migrationComplete}
                          className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                        >
                          {isMigrating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Migrating...
                            </>
                          ) : migrationComplete ? (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Migration Complete
                            </>
                          ) : (
                            <>
                              <Database className="mr-2 h-4 w-4" />
                              Migrate Items to Master
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={handleVerifyIntegrity}
                          variant="outline"
                          disabled={isMigrating}
                          className="flex-1"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Verify Data Integrity
                        </Button>
                      </div>

                      {migrationComplete && (
                        <div className="pt-4 border-t">
                          <p className="text-sm text-gray-600 text-center">
                            Migration has been completed. The button is now disabled to prevent duplicate runs.
                            Refresh the page if you need to run verification again.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Migration Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p><strong>What this migration does:</strong></p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Reads all items from INITIAL_ITEM_MAP (productConstants.js)</li>
                          <li>Checks items from product_list table</li>
                          <li>Maps items to their corresponding categories</li>
                          <li>Inserts items into items_master table (skips duplicates)</li>
                          <li>Provides detailed logging and results</li>
                        </ul>
                        <p className="mt-3"><strong>Safety features:</strong></p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Idempotent operation (safe to run multiple times)</li>
                          <li>Automatic duplicate detection and skipping</li>
                          <li>Batch processing for large datasets</li>
                          <li>Comprehensive error handling and logging</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            )}
          </Tabs>
        </motion.div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Migration</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will populate the <code className="bg-gray-100 px-1 rounded">items_master</code> table with all items from the product constants library.
              </p>
              <p>
                <strong>This operation is safe to run multiple times.</strong> Duplicate items will be automatically detected and skipped.
              </p>
              <p className="text-yellow-700 font-medium">
                ⚠️ The migration may take a few seconds to complete. Please do not close this window.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMigration} className="bg-blue-600 hover:bg-blue-700">
              Start Migration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ErrorBoundary>
  );
};

export default Dashboard;
