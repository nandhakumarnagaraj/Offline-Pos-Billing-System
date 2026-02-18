import React, { createContext, useContext, useState, useEffect } from 'react';
import { shopConfig as localDefaults } from '../config/shopConfig';
import { configService } from '../service/configService';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(localDefaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const remoteConfig = await configService.fetchConfig();
        if (remoteConfig) {
          const merged = {
            ...localDefaults,
            name: remoteConfig['shop.name'] || localDefaults.name,
            address: remoteConfig['shop.address'] ? remoteConfig['shop.address'].split('\n') : localDefaults.address,
            contact: {
              phone: remoteConfig['shop.phone'] || localDefaults.contact.phone,
              whatsapp: remoteConfig['shop.whatsapp'] || localDefaults.contact.whatsapp
            },
            gstin: remoteConfig['shop.gstin'] || localDefaults.gstin,
            fssai: remoteConfig['shop.fssai'] || localDefaults.fssai,
            gstEnabled: remoteConfig['tax.enabled'] === 'true',
            gstPercentage: parseFloat(remoteConfig['tax.defaultGstPercent']) || localDefaults.gstPercentage,
            tagline: remoteConfig['shop.tagline'] || localDefaults.tagline,
            footerMessage: remoteConfig['shop.footerMessage'] || localDefaults.footerMessage,
            logo: remoteConfig['shop.logoUrl'] || localDefaults.logo,
            softwareBy: remoteConfig['shop.softwareBy'] || localDefaults.softwareBy
          };
          setConfig(merged);
        }
      } catch (error) {
        console.error("Error loading config:", error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const refreshConfig = async () => {
    const remoteConfig = await configService.fetchConfig();
    if (remoteConfig) {
      const merged = {
        ...localDefaults,
        name: remoteConfig['shop.name'] || localDefaults.name,
        address: remoteConfig['shop.address'] ? remoteConfig['shop.address'].split('\n') : localDefaults.address,
        contact: {
          phone: remoteConfig['shop.phone'] || localDefaults.contact.phone,
          whatsapp: remoteConfig['shop.whatsapp'] || localDefaults.contact.whatsapp
        },
        gstin: remoteConfig['shop.gstin'] || localDefaults.gstin,
        fssai: remoteConfig['shop.fssai'] || localDefaults.fssai,
        gstEnabled: remoteConfig['tax.enabled'] === 'true',
        gstPercentage: parseFloat(remoteConfig['tax.defaultGstPercent']) || localDefaults.gstPercentage,
        tagline: remoteConfig['shop.tagline'] || localDefaults.tagline,
        footerMessage: remoteConfig['shop.footerMessage'] || localDefaults.footerMessage,
        logo: remoteConfig['shop.logoUrl'] || localDefaults.logo,
        softwareBy: remoteConfig['shop.softwareBy'] || localDefaults.softwareBy
      };
      setConfig(merged);
    }
  };

  return (
    <ConfigContext.Provider value={{ config, loading, refreshConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
