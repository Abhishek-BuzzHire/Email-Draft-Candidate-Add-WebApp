import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, Building, Home } from 'lucide-react';

const Navbar: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <Building className="h-6 w-6 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-800"><span className='text-red-500'>Buzz</span><span className='text-blue-700'>Hire</span> Daily Submit</span>
            </Link>
          </div>

          <div className="hidden md:flex space-x-4">
            <NavLink to="/" icon={<Home size={18} />} label="Dashboard" isActive={location.pathname === '/'} />

            <a
              href="http://192.168.1.201:3000"
              target='_blank'
              className="flex items-center font-semibold space-x-2 text-gray-800 text-sm hover:text-blue-500"
            >
              <Users size={18} />
              <span>View Database</span>
            </a>

            <NavLink
              to="/add-candidate"
              icon={<Users size={18} />}
              label="Add Candidate"
              isActive={location.pathname === '/add-candidate'}
            />
          </div>

          <div className="md:hidden">
            <button className="flex items-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav - simplified for MVP */}
      <div className="md:hidden border-t border-gray-200 bg-white fixed bottom-0 w-full shadow-lg">
        <div className="flex justify-around py-2">
          <MobileNavLink to="/" icon={<Home size={20} />} label="Home" isActive={location.pathname === '/'} />
          <MobileNavLink
            to="/add-candidate"
            icon={<Users size={20} />}
            label="Add"
            isActive={location.pathname === '/add-candidate'}
          />
        </div>
      </div>
    </nav>
  );
};

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon, label, isActive }) => {
  return (
    <Link
      to={to}
      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out
        ${isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
        }`}
    >
      <span className="mr-1.5">{icon}</span>
      {label}
    </Link>
  );
};

const MobileNavLink: React.FC<NavLinkProps> = ({ to, icon, label, isActive }) => {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center px-3 py-1 text-xs font-medium rounded-md transition-colors duration-150 ease-in-out
        ${isActive
          ? 'text-blue-600'
          : 'text-gray-500 hover:text-blue-600'
        }`}
    >
      {icon}
      <span className="mt-1">{label}</span>
    </Link>
  );
};

export default Navbar;