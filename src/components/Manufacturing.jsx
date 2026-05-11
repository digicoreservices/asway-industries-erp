import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import ManufacturingForm from '@/components/manufacturing/ManufacturingForm';
import SearchManufacturing from '@/components/manufacturing/SearchManufacturing';
import Breadcrumb from '@/components/Breadcrumb';

const Manufacturing = () => {
  const [activeTab, setActiveTab] = useState("add");

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Manufacturing' }
  ];

  return (
    <>
      <Helmet>
        <title>Manufacturing - Asway Industries ERP</title>
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-4 md:p-6"
      >
        <Breadcrumb items={breadcrumbItems} />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-6">
            <TabsTrigger 
              value="add"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Add
            </TabsTrigger>
            <TabsTrigger 
              value="search"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Search and Edit
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="add">
            <ManufacturingForm />
          </TabsContent>
          
          <TabsContent value="search">
            <SearchManufacturing onClose={() => setActiveTab("add")} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </>
  );
};

export default Manufacturing;