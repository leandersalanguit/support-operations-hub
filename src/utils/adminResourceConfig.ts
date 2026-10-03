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
  hasDetailsColumn?: boolean;
  hasTagsColumn?: boolean;
  firstColumnLabel?: string;
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
    searchPlaceholder: 'Search classifications...',
    categoryOptions: [],
    hasDetailsColumn: false,
    hasTagsColumn: false,
    firstColumnLabel: 'Classification',
    fields: [
      {
        key: 'name',
        label: 'Classification',
        type: 'text',
        required: true,
        placeholder: 'e.g. Software Bug, Hardware Failure, Account Access',
      },
    ],
    columns: [
      { key: 'name', label: 'Classification' },
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
    categoryOptions: ['Windows Software', 'MacOS Software', 'Legacy Software'],
    hasDetailsColumn: true,
    hasTagsColumn: true,
    firstColumnLabel: 'Software Name',
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
        options: ['Windows Software', 'MacOS Software', 'Legacy Software'],
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
      { key: 'categories', label: 'Categories' },
      { key: 'url', label: 'Link' },
      { key: 'details', label: 'Details' },
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
    categoryOptions: [
      'DSLR Photo Booth',
      'iPad Photo Booth',
      'Mirror Photo Booth',
      'Photo Booth Concepts',
      'Templates and Assets',
      'Video Booth',
    ],
    hasDetailsColumn: false,
    hasTagsColumn: true,
    firstColumnLabel: 'Resource Name',
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
        options: [
          'DSLR Photo Booth',
          'iPad Photo Booth',
          'Mirror Photo Booth',
          'Photo Booth Concepts',
          'Templates and Assets',
          'Video Booth',
        ],
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
        placeholder: 'Optional brief summary of the folder contents...',
      },
    ],
    columns: [
      { key: 'name', label: 'Resource Name' },
      { key: 'url', label: 'Drive Link' },
      { key: 'categories', label: 'Categories' },
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
    categoryOptions: [],
    hasDetailsColumn: true,
    hasTagsColumn: true,
    firstColumnLabel: 'Guide Title',
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
        defaultValue: '',
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
        options: [],
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
      { key: 'url', label: 'Link' },
      { key: 'categories', label: 'Categories' },
      { key: 'details', label: 'Details' },
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
    searchPlaceholder: 'Search hardware components...',
    categoryOptions: [],
    hasDetailsColumn: false,
    hasTagsColumn: true,
    firstColumnLabel: 'Component Name',
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
        key: 'categories',
        label: 'Categories',
        type: 'tags',
        required: false,
        options: [],
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
      { key: 'url', label: 'Link' },
      { key: 'categories', label: 'Categories' },
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
    searchPlaceholder: 'Search manuals...',
    categoryOptions: ['User Manuals'],
    hasDetailsColumn: false,
    hasTagsColumn: true,
    firstColumnLabel: 'Manual Name',
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
        options: ['User Manuals'],
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
      { key: 'version', label: 'Version' },
      { key: 'url', label: 'Link' },
      { key: 'categories', label: 'Categories' },
    ],
  },
};
