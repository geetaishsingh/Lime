import { createRoot } from 'react-dom/client'
import routes from './routes/index.jsx';
import { RouterProvider } from 'react-router-dom';
import store from './store/store.js';
import { Provider } from 'react-redux';

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <RouterProvider router={routes} />
  </Provider>
);
