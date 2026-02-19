import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { shopConfig as localDefaults } from '../config/shopConfig';
import { configService } from '../service/configService';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const ConfigContext = createContext();

const SOCKET_URL = `http://${window.location.hostname}:8080/ws`;

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(localDefaults);
  const [loading, setLoading] = useState(true);

  const mergeConfig = useCallback((remoteConfig) => {
    if (!remoteConfig) return;
    console.log("Merging remote config:", remoteConfig);
    setConfig(prev => {
      const base = prev || localDefaults;
      return {
        ...base,
        name: remoteConfig['shop.name'] || base.name,
        address: remoteConfig['shop.address'] ? remoteConfig['shop.address'].split('\n') : base.address,
        contact: {
          phone: remoteConfig['shop.phone'] || base.contact.phone,
          whatsapp: remoteConfig['shop.whatsapp'] || base.contact.whatsapp
        },
        gstin: remoteConfig['shop.gstin'] || base.gstin,
        fssai: remoteConfig['shop.fssai'] || base.fssai,
        gstEnabled: remoteConfig['tax.enabled'] === 'true',
        gstPercentage: parseFloat(remoteConfig['tax.defaultGstPercent']) || base.gstPercentage,
        tagline: remoteConfig['shop.tagline'] || base.tagline,
        footerMessage: remoteConfig['shop.footerMessage'] || base.footerMessage,
        logo: remoteConfig['shop.logoUrl'] || base.logo,
        softwareBy: 'Khana Book'
      };
    });
  }, []);

  // Update document metadata whenever config changes
  useEffect(() => {
    if (config) {
      document.title = `${config.name} - POS`;
      
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", `${config.name} - ${config.tagline || 'Restaurant POS'}`);
      }

      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon && config.logo) {
        favicon.setAttribute("href", config.logo);
      }
    }
  }, [config]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const remoteConfig = await configService.fetchConfig();
        if (remoteConfig) {
          mergeConfig(remoteConfig);
        }
      } catch (error) {
        console.error("Error loading config:", error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();

    // WebSocket for Real-time Config Updates
    const client = new Client({
      webSocketFactory: () => new SockJS(SOCKET_URL),
      onConnect: () => {
        client.subscribe('/topic/config', (message) => {
          const updatedConfig = JSON.parse(message.body);
          console.log("Config updated via WebSocket:", updatedConfig);
          mergeConfig(updatedConfig);
        });
      },
      reconnectDelay: 5000,
    });
    client.activate();

    return () => client.deactivate();
  }, [mergeConfig]);

  const refreshConfig = async () => {
    const remoteConfig = await configService.fetchConfig();
    if (remoteConfig) {
      mergeConfig(remoteConfig);
    }
  };

  return (
    <ConfigContext.Provider value={{ config, loading, refreshConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
