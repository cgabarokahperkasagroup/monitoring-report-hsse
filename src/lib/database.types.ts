export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  'monitoring-hsse': {
    Tables: {
      roles: {
        Row: {
          id: string
          key: string
          label: string
          description: string | null
          color: string | null
          is_system: boolean
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['roles']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['roles']['Insert']>
      }
      business_units: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['business_units']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['business_units']['Insert']>
      }
      finding_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['finding_categories']['Row'], 'id'>
          & { id?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['finding_categories']['Insert']>
      }
      pis_perusahaan: {
        Row: {
          id: string
          code: string
          name: string
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['pis_perusahaan']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['pis_perusahaan']['Insert']>
      }
      pis_finding_types: {
        Row: {
          id: string
          code: string
          label: string
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['pis_finding_types']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['pis_finding_types']['Insert']>
      }
      pis_categories: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['pis_categories']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['pis_categories']['Insert']>
      }
      external_inspection_types: {
        Row: {
          id: string
          code: string
          label: string
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['external_inspection_types']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['external_inspection_types']['Insert']>
      }
      fleets: {
        Row: {
          id: string
          name: string
          business_unit_id: string
          op_head_user_id: string | null
          hse_officer_id: string | null
          visit_frequency: 'daily' | 'weekly' | 'monthly'
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['fleets']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['fleets']['Insert']>
      }
      users: {
        Row: {
          id: string
          full_name: string
          email: string
          role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGEMENT' | 'HEAD_HSSE' | 'STAFF_HSSE' | 'OP_HEAD' | 'SITE_MGR' | 'PIC' | 'VIEWER'
          is_active: boolean
          must_change_password: boolean
          fleet_id: string | null
          avatar: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['users']['Insert']>
      }
      user_business_units: {
        Row: { user_id: string; business_unit_id: string }
        Insert: Database['monitoring-hsse']['Tables']['user_business_units']['Row']
        Update: Partial<Database['monitoring-hsse']['Tables']['user_business_units']['Row']>
      }
      vessels: {
        Row: {
          id: string
          name: string
          imo_number: string | null
          vessel_type: string | null
          fleet_id: string
          business_unit_id: string
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['vessels']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['vessels']['Insert']>
      }
      sites: {
        Row: {
          id: string
          name: string
          business_unit_id: string
          address: string | null
          site_type: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['sites']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['sites']['Insert']>
      }
      user_sites: {
        Row: { user_id: string; site_id: string }
        Insert: Database['monitoring-hsse']['Tables']['user_sites']['Row']
        Update: Partial<Database['monitoring-hsse']['Tables']['user_sites']['Row']>
      }
      visit_schedules: {
        Row: {
          id: string
          vessel_id: string
          fleet_id: string
          op_head_user_id: string | null
          scheduled_date: string
          period_month: number
          period_year: number
          visit_id: string | null
          status: 'PLANNED' | 'DUE_SOON' | 'OVERDUE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
          notes: string | null
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['visit_schedules']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['visit_schedules']['Insert']>
      }
      visits: {
        Row: {
          id: string
          reference_no: string
          visit_type: 'OWNER_VISIT' | 'VESSEL_VISIT' | 'SITE_VISIT'
          business_unit_id: string
          vessel_id: string | null
          site_id: string | null
          visit_date: string
          start_time: string | null
          end_time: string | null
          participants: string[]
          agenda: string | null
          summary: string | null
          status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
          created_by: string
          approved_by: string | null
          approved_at: string | null
          rejection_notes: string | null
          attachments: string[]
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['visits']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['visits']['Insert']>
      }
      findings: {
        Row: {
          id: string
          reference_no: string
          visit_id: string
          business_unit_id: string
          title: string
          description: string
          category: string
          priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
          source_type: 'OWNER_VISIT' | 'VESSEL_VISIT' | 'SITE_VISIT'
          is_owner_finding: boolean
          assigned_to: string | null
          target_close_date: string
          status: 'OPEN' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'CLOSED' | 'OVERDUE'
          initial_photos: string[]
          closed_at: string | null
          closed_by: string | null
          closing_evidence: string[]
          closing_notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['findings']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['findings']['Insert']>
      }
      finding_progress_entries: {
        Row: {
          id: string
          finding_id: string
          action_date: string
          action_type: 'INSPECTION' | 'COORDINATION' | 'REPAIR' | 'MONITORING' | 'TESTING' | 'FINAL_VERIFY' | 'OTHER'
          description: string
          photos: string[]
          next_steps: string | null
          next_action_date: string | null
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['finding_progress_entries']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['finding_progress_entries']['Insert']>
      }
      finding_closing_requests: {
        Row: {
          id: string
          finding_id: string
          action_date: string
          summary: string
          condition_after: string
          evidence_photos: string[]
          evidence_documents: string[]
          submitted_by: string
          submitted_at: string
          reviewed_by: string | null
          reviewed_at: string | null
          review_decision: 'APPROVED' | 'REJECTED' | null
          rejection_notes: string | null
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['finding_closing_requests']['Row'], 'id' | 'submitted_at'>
          & { id?: string; submitted_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['finding_closing_requests']['Insert']>
      }
      vessel_visit_compliance: {
        Row: {
          id: string
          fleet_id: string
          vessel_id: string
          op_head_user_id: string
          visit_id: string
          visit_date: string
          period_month: number
          period_year: number
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['vessel_visit_compliance']['Row'], 'id'>
          & { id?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['vessel_visit_compliance']['Insert']>
      }
      internal_inspection_schedules: {
        Row: {
          id: string
          vessel_id: string
          fleet_id: string
          hse_officer_id: string | null
          scheduled_date: string
          period_month: number
          period_year: number
          inspection_id: string | null
          status: 'PLANNED' | 'DUE_SOON' | 'OVERDUE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
          notes: string | null
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['internal_inspection_schedules']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['internal_inspection_schedules']['Insert']>
      }
      internal_inspections: {
        Row: {
          id: string
          reference_no: string
          vessel_id: string
          business_unit_id: string
          inspection_date: string
          lead_inspector: string
          status: 'DRAFT' | 'SUBMITTED' | 'APPROVED'
          result: 'SATISFACTORY' | 'CONDITIONAL' | 'UNSATISFACTORY' | null
          total_items_checked: number
          items_satisfactory: number
          items_deficient: number
          notes: string | null
          approved_by: string | null
          approved_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['internal_inspections']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['internal_inspections']['Insert']>
      }
      internal_inspection_inspectors: {
        Row: { inspection_id: string; user_id: string }
        Insert: Database['monitoring-hsse']['Tables']['internal_inspection_inspectors']['Row']
        Update: Partial<Database['monitoring-hsse']['Tables']['internal_inspection_inspectors']['Row']>
      }
      external_inspections: {
        Row: {
          id: string
          reference_no: string
          vessel_id: string
          business_unit_id: string
          inspection_type: string
          inspection_date: string
          inspecting_body: string
          lead_inspector: string | null
          port: string | null
          status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
          result: 'SATISFACTORY' | 'CONDITIONAL' | 'UNSATISFACTORY' | null
          total_observations: number
          critical_observations: number
          major_observations: number
          minor_observations: number
          validity_date: string | null
          next_inspection_date: string | null
          report_no: string | null
          notes: string | null
          actions_taken: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['external_inspections']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['external_inspections']['Insert']>
      }
      inspection_findings: {
        Row: {
          id: string
          internal_inspection_id: string | null
          external_inspection_id: string | null
          area: string
          description: string
          priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
          status: 'OPEN' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'CLOSED' | 'OVERDUE'
          assigned_to: string | null
          target_close_date: string
          closed_at: string | null
          initial_photos: string[]
          closing_evidence: string[]
          closing_notes: string | null
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['inspection_findings']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['inspection_findings']['Insert']>
      }
      inspection_finding_progress: {
        Row: {
          id: string
          finding_id: string
          action_date: string
          action_type: 'INSPECTION' | 'COORDINATION' | 'REPAIR' | 'MONITORING' | 'TESTING' | 'FINAL_VERIFY' | 'OTHER'
          description: string
          photos: string[]
          next_steps: string | null
          next_action_date: string | null
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['inspection_finding_progress']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['inspection_finding_progress']['Insert']>
      }
      inspection_finding_closing_requests: {
        Row: {
          id: string
          finding_id: string
          action_date: string
          summary: string
          condition_after: string
          evidence_photos: string[]
          submitted_at: string
          review_decision: 'APPROVED' | 'REJECTED' | null
          rejection_notes: string | null
          reviewed_at: string | null
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['inspection_finding_closing_requests']['Row'], 'id' | 'submitted_at'>
          & { id?: string; submitted_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['inspection_finding_closing_requests']['Insert']>
      }
      pis_findings: {
        Row: {
          id: string
          no: number
          perusahaan: string
          deskripsi: string
          nama_kapal: string
          fleet_inspector: string
          status: 'CLOSED' | 'OPEN' | 'ON_PROSES' | 'REJECTED' | 'PROCESS_APPROVAL'
          temuan: 'NEGATIVE_FEEDBACK' | 'VETTING_PLUS' | 'SELF_ASSESSMENT'
          no_ticket: string
          nomor_memo: string | null
          tanggal_memo: string | null
          category: string
          kendala_action_plan: string | null
          approval_note: string | null
          reject_note: string | null
          open_date: string
          target_closed_date: string | null
          actual_closed_date: string | null
          operation_head: string | null
          person_in_charge: string | null
          pending_invoice_sistem: boolean
          pending_invoice_finance: boolean
          kode_month_open: string | null
          kode_month_closing: string | null
          kode_year_open: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['pis_findings']['Row'], 'id' | 'no' | 'created_at' | 'updated_at'>
          & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['pis_findings']['Insert']>
      }
      pis_progress_entries: {
        Row: {
          id: string
          pis_finding_id: string
          action_date: string
          description: string
          action_by: string
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['pis_progress_entries']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['pis_progress_entries']['Insert']>
      }
      pis_closing_requests: {
        Row: {
          id: string
          pis_finding_id: string
          actual_closed_date: string
          summary: string
          catatan: string | null
          submitted_by: string
          submitted_at: string
          review_decision: 'APPROVED' | 'REJECTED' | null
          rejection_notes: string | null
          reviewed_at: string | null
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['pis_closing_requests']['Row'], 'id' | 'submitted_at'>
          & { id?: string; submitted_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['pis_closing_requests']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          related_id: string | null
          related_type: string | null
          is_read: boolean
          created_at: string
        }
        Insert: Omit<Database['monitoring-hsse']['Tables']['notifications']['Row'], 'id' | 'created_at'>
          & { id?: string; created_at?: string }
        Update: Partial<Database['monitoring-hsse']['Tables']['notifications']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
