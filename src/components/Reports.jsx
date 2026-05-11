import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { FileText, Users, Box, Calendar, IndianRupee, User } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import TotalListReport from '@/components/reports/TotalListReport';
import CustomerWiseReport from '@/components/reports/CustomerWiseReport';
import ProductWiseReport from '@/components/reports/ProductWiseReport';
import DeliveryWiseReport from '@/components/reports/DeliveryWiseReport';
import ValueWiseReport from '@/components/reports/ValueWiseReport';
import UserWiseReport from '@/components/reports/UserWiseReport';

const reportButtons = [
  { label: "Total List wise", icon: FileText, component: TotalListReport, reportName: "Total Purchase Order Receipts" },
  { label: "Customer wise", icon: Users, component: CustomerWiseReport, reportName: "Receipts by Customer" },
  { label: "Product & Description wise", icon: Box, component: ProductWiseReport, reportName: "Receipts by Product" },
  { label: "Expected delivery wise", icon: Calendar, component: DeliveryWiseReport, reportName: "Receipts by Delivery Date" },
  { label: "Value wise", icon: IndianRupee, component: ValueWiseReport, reportName: "Receipts by Value Range" },
  { label: "User Wise", icon: User, component: UserWiseReport, reportName: "Receipts by User" },
];

const Reports = () => {
  return (
    <>
      <Helmet>
        <title>Reports - Asway Industries ERP</title>
        <meta name="description" content="View and Generate Reports for Asway Industries ERP" />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-4 md:p-6 bg-gray-50/50 min-h-screen"
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Reports</h1>

        <section className="mb-10 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6 border-b pb-3">Purchase Order Receipt from Customer Reports</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportButtons.map(({ label, icon: Icon, component: ReportComponent, reportName }) => (
              <Dialog key={label}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center justify-start gap-3 p-6 text-base h-auto hover:bg-gray-100 transition-colors"
                  >
                    <Icon className="h-6 w-6 text-blue-600" />
                    <span>{label}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>{reportName}</DialogTitle>
                  </DialogHeader>
                  <div className="flex-grow overflow-y-auto pr-6">
                    <ReportComponent />
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </section>

        <div className="mt-8 p-6 border-2 border-dashed rounded-lg bg-white shadow-sm text-center text-gray-500">
          <p>More reporting modules will be available here soon.</p>
        </div>
      </motion.div>
    </>
  );
};

export default Reports;