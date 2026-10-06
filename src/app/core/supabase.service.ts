import { Injectable } from '@angular/core';

import {
  createClient,
  SupabaseClient,
  User
} from '@supabase/supabase-js';

import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  private readonly supabase: SupabaseClient;


  constructor() {

    this.supabase =
      createClient(
        environment.supabaseUrl,
        environment.supabaseAnonKey
      );

  }


  getClient(): SupabaseClient {

    return this.supabase;

  }


  async getUser(): Promise<User | null> {

    const {
      data,
      error
    } =
      await this.supabase.auth.getUser();


    if (error) {

      throw error;

    }


    return data.user;

  }


  async getSession() {

    const {
      data,
      error
    } =
      await this.supabase.auth.getSession();


    if (error) {

      throw error;

    }


    return data.session;

  }

}