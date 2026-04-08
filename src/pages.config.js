/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AddImageToQR from './pages/AddImageToQR';
import ContactDetail from './pages/ContactDetail';
import Contacts from './pages/Contacts';
import EditContact from './pages/EditContact';
import EditProduct from './pages/EditProduct';
import EditTemplate from './pages/EditTemplate';
import Help from './pages/Help';
import Marketing from './pages/Marketing';
import More from './pages/More';
import NewContact from './pages/NewContact';
import NewSale1 from './pages/NewSale1';
import NewSale2 from './pages/NewSale2';
import NewSale3 from './pages/NewSale3';
import NewSale4 from './pages/NewSale4';
import Notifications from './pages/Notifications';
import Partners from './pages/Partners';
import PreviewQR from './pages/PreviewQR';
import Products from './pages/Products';
import QRGenerator from './pages/QRGenerator';
import Sales from './pages/Sales';
import SelectMessageTone from './pages/SelectMessageTone';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import Templates from './pages/Templates';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddImageToQR": AddImageToQR,
    "ContactDetail": ContactDetail,
    "Contacts": Contacts,
    "EditContact": EditContact,
    "EditProduct": EditProduct,
    "EditTemplate": EditTemplate,
    "Help": Help,
    "Marketing": Marketing,
    "More": More,
    "NewContact": NewContact,
    "NewSale1": NewSale1,
    "NewSale2": NewSale2,
    "NewSale3": NewSale3,
    "NewSale4": NewSale4,
    "Notifications": Notifications,
    "Partners": Partners,
    "PreviewQR": PreviewQR,
    "Products": Products,
    "QRGenerator": QRGenerator,
    "Sales": Sales,
    "SelectMessageTone": SelectMessageTone,
    "Settings": Settings,
    "Tasks": Tasks,
    "Templates": Templates,
}

export const pagesConfig = {
    mainPage: "Tasks",
    Pages: PAGES,
    Layout: __Layout,
};