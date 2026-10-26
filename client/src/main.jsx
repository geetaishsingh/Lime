import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx';
import routes from './routes/index.jsx';
import { RouterProvider } from 'react-router-dom';
import store from './redux/store.js';
import { Provider } from 'react-redux';
createRoot(document.getElementById('root')).render(
    <Provider store={store}>
      <RouterProvider router={routes} />
    </Provider>
)
