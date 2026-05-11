import React, { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Truck, 
  Package, 
  FileText, 
  ShoppingCart, 
  ClipboardList, 
  Factory,
  BarChart3,
  LogOut,
  X,
  FileSignature,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/clients', icon: Users, label: 'Customers' },
  { path: '/suppliers', icon: Truck, label: 'Suppliers' },
  { path: '/quotations', icon: FileText, label: 'Quotations' },
  { path: '/order-receipts', icon: FileSignature, label: 'Purchase Order Receipt from Customer' },
  { path: '/work-orders', icon: ClipboardList, label: 'Work Order - Internal' },
  { path: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Order Issued to Supplier' },
  { path: '/items', icon: Package, label: 'Invoice from Supplier and Store Items - Stock' },
  { path: '/supplier-payment', icon: CreditCard, label: 'Payment to Supplier' },
  { path: '/manufacturing', icon: Factory, label: 'Manufacturing' },
  { path: '/invoice', icon: FileText, label: 'Invoice and Payment for Customer' }, 
  { path: '/reports', icon: BarChart3, label: 'Reports' },
];

const sidebarVariants = {
  open: { x: 0, transition: { duration: 0.2, ease: 'easeInOut' } },
  closed: { x: '-100%', transition: { duration: 0.2, ease: 'easeInOut' } },
};

const Sidebar = memo(({ isOpen, toggleSidebar, onLogout }) => {
  return (
    <>
      <motion.aside
        initial={false}
        animate={isOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        className="fixed lg:static inset-y-0 left-0 z-40 w-64 sidebar-gradient text-white shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-blue-800/50 flex justify-between items-center shrink-0">
          <div className="flex flex-col items-center w-full"> 
            <h1 className="text-xl font-bold text-white text-center whitespace-nowrap"> 
              Asway Industries Pvt Ltd
            </h1>
            <p className="text-sm text-blue-200 mt-1 font-bold text-center"> 
              ERP System
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-white hover:bg-blue-800/50 absolute right-2"
            onClick={toggleSidebar}
          >
            <X size={24} />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => { if (window.innerWidth < 1024) toggleSidebar(); }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150 text-sm font-medium ${
                      isActive
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-blue-100 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-blue-800/50 shrink-0">
          <Button
            onClick={onLogout}
            variant="ghost"
            className="w-full justify-start text-blue-100 hover:bg-red-600/80 hover:text-white transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            <span className="text-sm font-medium">Logout</span>
          </Button>
        </div>
      </motion.aside>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}
    </>
  );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;