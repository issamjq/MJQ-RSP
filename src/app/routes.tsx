import { createBrowserRouter } from 'react-router';
import { MainApp } from './pages/main-app';
import { ComponentsDemo } from './components/components-demo';
import { Overview } from './pages/overview';
import { Companies } from './pages/companies';
import { Products } from './pages/products';
import { Monitoring } from './pages/monitoring';
import { Discovering } from './pages/discovering';
import { AIMonitoring } from './pages/ai-monitoring';
import { Settings } from './pages/settings';
import { ErrorPage } from './pages/error-page';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: MainApp,
    errorElement: <ErrorPage />,
  },
  {
    path: '/overview',
    Component: Overview,
    errorElement: <ErrorPage />,
  },
  {
    path: '/companies',
    Component: Companies,
    errorElement: <ErrorPage />,
  },
  {
    path: '/products',
    Component: Products,
    errorElement: <ErrorPage />,
  },
  {
    path: '/monitoring',
    Component: Monitoring,
    errorElement: <ErrorPage />,
  },
  {
    path: '/discovering',
    Component: Discovering,
    errorElement: <ErrorPage />,
  },
  {
    path: '/ai-monitoring',
    Component: AIMonitoring,
    errorElement: <ErrorPage />,
  },
  {
    path: '/settings',
    Component: Settings,
    errorElement: <ErrorPage />,
  },
  {
    path: '/components',
    Component: ComponentsDemo,
    errorElement: <ErrorPage />,
  },
]);