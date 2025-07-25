// src/context/CompanyContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Empresa } from '@/types/database';
import { useAuth } from './AuthContext';

interface CompanyContextType {
  crearEmpresa: (datosEmpresa: Omit<Empresa, 'id' | 'fechaRegistro'>) => Promise<string>;
  actualizarEmpresa: (id: string, datos: Partial<Empresa>) => Promise<void>;
  obtenerEmpresa: (id: string) => Promise<Empresa | null>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany debe ser usado dentro de un CompanyProvider');
  }
  return context;
}

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user, usuario, actualizarPerfil } = useAuth();

  const crearEmpresa = async (datosEmpresa: Omit<Empresa, 'id' | 'fechaRegistro'>): Promise<string> => {
    if (!user || !usuario) {
      throw new Error('Usuario no autenticado');
    }

    // Crear documento de empresa
    const empresaRef = doc(collection(db, 'empresas'));
    const nuevaEmpresa: Omit<Empresa, 'id'> = {
      ...datosEmpresa,
      fechaRegistro: new Date() as any
    };

    await setDoc(empresaRef, nuevaEmpresa);

    // Actualizar usuario con la nueva empresa
    const nuevasEmpresas = [
      ...usuario.empresas,
      {
        empresaId: empresaRef.id,
        rol: 'owner' as const,
        fechaAsignacion: new Date() as any
      }
    ];

    await actualizarPerfil({
      empresas: nuevasEmpresas
    });

    return empresaRef.id;
  };

  const actualizarEmpresa = async (id: string, datos: Partial<Empresa>) => {
    await updateDoc(doc(db, 'empresas', id), datos);
  };

  const obtenerEmpresa = async (id: string): Promise<Empresa | null> => {
    const empresaDoc = await getDoc(doc(db, 'empresas', id));
    return empresaDoc.exists() ? { id: empresaDoc.id, ...empresaDoc.data() } as Empresa : null;
  };

  const value = {
    crearEmpresa,
    actualizarEmpresa,
    obtenerEmpresa
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}