import { createBrowserRouter, Navigate } from 'react-router';
import { RouterLayout } from './components/page-transition';
import { MainApp } from './pages/main-app';
import { Overview } from './pages/overview';
import { Companies } from './pages/companies';
import { Products } from './pages/products';
import { PriceBoard, TrackedUrls } from './pages/monitoring';
import { Discovering } from './pages/discovering';
import { Settings } from './pages/settings';
import { ErrorPage } from './pages/error-page';

export const router = createBrowserRouter([
  {
    element: <RouterLayout />,
    children: [
      { path: '/', Component: MainApp, errorElement: <ErrorPage /> },
      { path: '/overview', Component: Overview, errorElement: <ErrorPage /> },
      { path: '/companies', Component: Companies, errorElement: <ErrorPage /> },
      { path: '/products', Component: Products, errorElement: <ErrorPage /> },
      { path: '/price-board', Component: PriceBoard, errorElement: <ErrorPage /> },
      { path: '/tracked-urls', Component: TrackedUrls, errorElement: <ErrorPage /> },
      { path: '/monitoring', element: <Navigate to='/price-board' replace /> },
      { path: '/discovering', Component: Discovering, errorElement: <ErrorPage /> },
      { path: '/settings', Component: Settings, errorElement: <ErrorPage /> },
      { path: '*', element: <Navigate to='/overview' replace /> },
    ],
  },
]);
