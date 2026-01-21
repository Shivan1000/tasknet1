import React, { ReactNode } from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="p-4 sm:p-8 bg-[#050505]">
        {children}
      </main>
    </div>
  );
};

export default Layout;
