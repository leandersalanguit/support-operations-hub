/**
 * @file adminResourceConfig.ts
 * @description Centralized resource configuration schema for the Support Operations Hub Admin Dashboard.
 * Defines database table names, audit identifiers, required/optional fields, and options
 * for Case Classifications, Installers, Marketing Folders, Quick Start Guides, Recommended Hardware, and Manuals.
 */

import React from 'react';
import {
  Tags,
  Download,
  FolderOpen,
  BookOpen,
  Cpu,
  FileText,
} from 'lucide-react';
import { INSTALLER_CATEGORIES } from '../data/installers';
import { MARKETING_CATEGORIES } from '../data/marketingFolders';
import { QUICK_START_CATEGORIES } from '../data/quickStartGuides';
import { HARDWARE_CATEGORIES } from '../data/recommendedHardware';
import { MANUAL_CATEGORIES } from '../data/manuals';

export type AdminResourceKey =
  | 'admin-case-classifications'
  | 'admin-installers'
  | 'admin-marketing-folders'
  | 'admin-quick-start-guides'
  | 'admin-recommended-hardware'
  | 'admin-manuals';

export interface ResourceFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'url' | 'select' | 'tags' | 'textarea' | 'number';
  required: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: string[];
  helpText?: string;
}

export interface AdminResourceConfig {
  key: AdminResourceKey;
  tableName: string;
  catalogType: string;
  title: string;
  singular: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  searchPlaceholder: string;
  categoryOptions: string[];
  fields: ResourceFieldDefinition[];
  columns: {
    key: string;
    label: string;
    render?: (item: any) => React.ReactNode;
  }[];
}

export const ADMIN_RESOURCE_CONFIGS: Record<AdminResourceKey, AdminResourceConfig> = {
  'admin-case-classifications': {
    key: 'admin-case-classifications',
    tableName: 'case_classifications',
    catalogType: 'case_classification',
    title: 'Case Classifications',
    singular: 'Classification',
    description: 'System-wide support inquiry and interaction case classifications for incident categorization.',
    icon: Tags,
    searchPlaceholder: 'Search classifications or categories...',
    categoryOptions: ['General', 'Hardware', 'Software', 'Billing', 'Account Access', 'Licensing'],
    fields: [
      {
        key: 'name',
        label: 'Classification Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Software Bug, Hardware Failure, Account Access',
      },
      {
        key: 'category',
        label: 'Category Group',
        type: 'text',
        required: false,
        defaultValue: 'General',
        placeholder: 'e.g. General, Software, Hardware',
        helpText: 'Optional logical category grouping for this classification.',
      },
    ],
    columns: [
      { key: 'name', label: 'Classification' },
      { key: 'category', label: 'Category' },
    ],
  },

  'admin-installers': {
    key: 'admin-installers',
    tableName: 'installers',
    catalogType: 'installer',
    title: 'Product Installers',
    singular: 'Installer',
    description: 'Software suites, camera SDK drivers, printer spoolers, and diagnostic recovery utilities.',
    icon: Download,
    searchPlaceholder: 'Search software, version, OS, download URL...',
    categoryOptions: [...INSTALLER_CATEGORIES],
    fields: [
      {
        key: 'name',
        label: 'Product / Software Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. FMPrint, Photo Mosaic Wall, DSLR Spooler',
      },
      {
        key: 'url',
        label: 'Download Link / URL',
        type: 'url',
        required: true,
        placeholder: 'https://drive.google.com/... or direct installer link',
        helpText: 'Public or secure drive link where team and clients can download the software.',
      },
      {
        key: 'version',
        label: 'Version',
        type: 'text',
        required: false,
        placeholder: 'e.g. 5.0.23, v1.2',
      },
      {
        key: 'categories',
        label: 'Categories',
        type: 'tags',
        required: false,
        options: [...INSTALLER_CATEGORIES],
        helpText: 'Select tags that describe this software installer.',
      },
      {
        key: 'operating_system',
        label: 'Operating System',
        type: 'text',
        required: false,
        placeholder: 'e.g. Windows 11 / 10 (64-bit)',
      },
      {
        key: 'file_size',
        label: 'File Size',
        type: 'text',
        required: false,
        placeholder: 'e.g. 98 MB, 1.2 GB',
      },
      {
        key: 'description',
        label: 'Description / Release Notes',
        type: 'textarea',
        required: false,
        placeholder: 'Optional release notes or compatibility requirements...',
      },
    ],
    columns: [
      { key: 'name', label: 'Software Name' },
      { key: 'version', label: 'Version' },
      { key: 'categories', label: 'Categories' },
      { key: 'url', label: 'Link' },
      { key: 'operating_system', label: 'OS' },
    ],
  },

  'admin-marketing-folders': {
    key: 'admin-marketing-folders',
    tableName: 'marketing_resources',
    catalogType: 'marketing_resource',
    title: 'Marketing Folders',
    singular: 'Marketing Resource',
    description: 'Branch marketing folders, product collateral, templates, and corporate brand asset libraries.',
    icon: FolderOpen,
    searchPlaceholder: 'Search marketing folders, assets, or categories...',
    categoryOptions: [...MARKETING_CATEGORIES],
    fields: [
      {
        key: 'name',
        label: 'Folder / Asset Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. AI Cloud Assets, Mirror Me Booth Marketing',
      },
      {
        key: 'url',
        label: 'Google Drive / Asset Link',
        type: 'url',
        required: true,
        placeholder: 'https://drive.google.com/drive/folders/...',
        helpText: 'Link to shared Google Drive folder or marketing repository.',
      },
      {
        key: 'categories',
        label: 'Categories',
        type: 'tags',
        required: false,
        options: [...MARKETING_CATEGORIES],
      },
    ],
    columns: [
      { key: 'name', label: 'Resource Name' },
      { key: 'categories', label: 'Categories' },
      { key: 'url', label: 'Drive Link' },
    ],
  },

  'admin-quick-start-guides': {
    key: 'admin-quick-start-guides',
    tableName: 'quick_start_guides',
    catalogType: 'quick_start_guide',
    title: 'Quick Start Guides',
    singular: 'Quick Start Guide',
    description: 'Rapid setup checklists, calibration steps, and quick triage instructions for branch operators.',
    icon: BookOpen,
    searchPlaceholder: 'Search guides, difficulty, time...',
    categoryOptions: [...QUICK_START_CATEGORIES],
    fields: [
      {
        key: 'name',
        label: 'Guide Name / Title',
        type: 'text',
        required: true,
        placeholder: 'e.g. 5-Minute Workstation Setup, Camera Calibration',
      },
      {
        key: 'url',
        label: 'Guide Link / Video URL',
        type: 'url',
        required: true,
        placeholder: 'https://... document or video walkthrough URL',
      },
      {
        key: 'difficulty',
        label: 'Difficulty Level',
        type: 'select',
        required: false,
        defaultValue: 'Beginner',
        options: ['Beginner', 'Intermediate', 'Advanced'],
      },
      {
        key: 'estimated_time',
        label: 'Estimated Time',
        type: 'text',
        required: false,
        placeholder: 'e.g. 5 mins, 15 mins',
      },
      {
        key: 'categories',
        label: 'Categories',
        type: 'tags',
        required: false,
        options: [...QUICK_START_CATEGORIES],
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
        placeholder: 'Optional brief summary of the checklist steps...',
      },
    ],
    columns: [
      { key: 'name', label: 'Guide Title' },
      { key: 'difficulty', label: 'Difficulty' },
      { key: 'estimated_time', label: 'Est. Time' },
      { key: 'categories', label: 'Categories' },
      { key: 'url', label: 'Link' },
    ],
  },

  'admin-recommended-hardware': {
    key: 'admin-recommended-hardware',
    tableName: 'recommended_hardware',
    catalogType: 'recommended_hardware',
    title: 'Recommended Hardware',
    singular: 'Hardware Component',
    description: 'Certified cameras, printers, mini PCs, touchscreens, and peripherals for support operations.',
    icon: Cpu,
    searchPlaceholder: 'Search hardware components, model, price, status...',
    categoryOptions: [...HARDWARE_CATEGORIES],
    fields: [
      {
        key: 'name',
        label: 'Hardware / Product Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Canon EOS Rebel T7, DNP DS620A Dye-Sub Printer',
      },
      {
        key: 'url',
        label: 'Product / Reference Link',
        type: 'url',
        required: true,
        placeholder: 'https://... spec sheet or vendor purchase link',
      },
      {
        key: 'status',
        label: 'Certification Status',
        type: 'select',
        required: false,
        defaultValue: 'Recommended',
        options: ['Recommended', 'Certified Compatible', 'Legacy Supported'],
      },
      {
        key: 'model_number',
        label: 'Model / Part Number',
        type: 'text',
        required: false,
        placeholder: 'e.g. 2727C002-DM',
      },
      {
        key: 'estimated_price',
        label: 'Estimated Price',
        type: 'text',
        required: false,
        placeholder: 'e.g. $479.99',
      },
      {
        key: 'categories',
        label: 'Categories',
        type: 'tags',
        required: false,
        options: [...HARDWARE_CATEGORIES],
      },
      {
        key: 'specifications',
        label: 'Key Specifications',
        type: 'text',
        required: false,
        placeholder: 'e.g. 24.1 MP APS-C Sensor, Full HD 1080p, AC Coupler',
      },
      {
        key: 'description',
        label: 'Description / Notes',
        type: 'textarea',
        required: false,
        placeholder: 'Usage guidelines, cable recommendations, or notes...',
      },
    ],
    columns: [
      { key: 'name', label: 'Component Name' },
      { key: 'status', label: 'Status' },
      { key: 'model_number', label: 'Model' },
      { key: 'estimated_price', label: 'Price' },
      { key: 'categories', label: 'Categories' },
      { key: 'url', label: 'Link' },
    ],
  },

  'admin-manuals': {
    key: 'admin-manuals',
    tableName: 'manuals',
    catalogType: 'manual',
    title: 'Product Manuals',
    singular: 'Manual',
    description: 'Official operations manuals, wiring diagrams, assembly schematics, and service guides.',
    icon: FileText,
    searchPlaceholder: 'Search manuals, format, version...',
    categoryOptions: [...MANUAL_CATEGORIES],
    fields: [
      {
        key: 'name',
        label: 'Manual / Document Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Scranton Branch Workstation Operator Manual',
      },
      {
        key: 'url',
        label: 'Document Link / URL',
        type: 'url',
        required: true,
        placeholder: 'https://... link to PDF or online document',
      },
      {
        key: 'format',
        label: 'Format',
        type: 'select',
        required: false,
        defaultValue: 'PDF',
        options: ['PDF', 'Interactive', 'Document'],
      },
      {
        key: 'version',
        label: 'Version / Revision',
        type: 'text',
        required: false,
        placeholder: 'e.g. Rev 4.2',
      },
      {
        key: 'categories',
        label: 'Categories',
        type: 'tags',
        required: false,
        options: [...MANUAL_CATEGORIES],
      },
      {
        key: 'file_size',
        label: 'File Size',
        type: 'text',
        required: false,
        placeholder: 'e.g. 7.4 MB',
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
        placeholder: 'Brief summary of document sections...',
      },
    ],
    columns: [
      { key: 'name', label: 'Manual Name' },
      { key: 'format', label: 'Format' },
      { key: 'version', label: 'Version' },
      { key: 'categories', label: 'Categories' },
      { key: 'url', label: 'Link' },
    ],
  },
};
