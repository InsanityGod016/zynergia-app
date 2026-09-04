import { lazy } from 'react';
import Layout from './Layout.jsx';

const page = importer => lazy(importer);

export const Pages = {
  AddImageToQR: page(() => import('./pages/AddImageToQR')),
  ContactDetail: page(() => import('./pages/ContactDetail')),
  Contacts: page(() => import('./pages/Contacts')),
  EditContact: page(() => import('./pages/EditContact')),
  EditProduct: page(() => import('./pages/EditProduct')),
  EditTemplate: page(() => import('./pages/EditTemplate')),
  Help: page(() => import('./pages/Help')),
  Marketing: page(() => import('./pages/Marketing')),
  More: page(() => import('./pages/More')),
  NewContact: page(() => import('./pages/NewContact')),
  NewTask: page(() => import('./pages/NewTask')),
  NewSale1: page(() => import('./pages/NewSale1')),
  NewSale2: page(() => import('./pages/NewSale2')),
  NewSale3: page(() => import('./pages/NewSale3')),
  NewSale4: page(() => import('./pages/NewSale4')),
  Notifications: page(() => import('./pages/Notifications')),
  Partners: page(() => import('./pages/Partners')),
  PreviewQR: page(() => import('./pages/PreviewQR')),
  Products: page(() => import('./pages/Products')),
  QRGenerator: page(() => import('./pages/QRGenerator')),
  Sales: page(() => import('./pages/Sales')),
  SelectMessageTone: page(() => import('./pages/SelectMessageTone')),
  Settings: page(() => import('./pages/Settings')),
  Tasks: page(() => import('./pages/Tasks')),
  Templates: page(() => import('./pages/Templates')),
};

export const pagesConfig = {
  mainPage: 'Tasks',
  Pages,
  Layout,
};
