from flask import Flask, request, jsonify
import mysql.connector
from dotenv import load_dotenv
import os
from flask_cors import CORS
import json
import uuid
import hashlib
from werkzeug.utils import secure_filename
from datetime import datetime, date

load_dotenv()
app = Flask(__name__)
CORS(app)

db_config = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "database": os.getenv("DB_NAME")
}

def get_db_connection():
    """Establishes and returns a database connection."""
    try:
        connection = mysql.connector.connect(**db_config)
        return connection
    except mysql.connector.Error as err:
        print(f"Error connecting to database: {err}")
        return None

@app.route('/api/candidates/count/today', methods=['GET'])
def get_today_candidates_count():
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()

    try:
        today_date_str = date.today().strftime('%Y-%m-%d')
        sql = "SELECT COUNT(*) FROM mail_candidate WHERE DATE(createdAt) = %s"

        cursor.execute(sql, (today_date_str,))
        count = cursor.fetchone()[0] # Fetch the single result (the count)

        return jsonify({"count": count}), 200
    
    except mysql.connector.Error as err:
        print(f"Error fetching today's candidate count: {err}")
        return jsonify({"error": "Failed to fetch today's candidate count", "details": str(err)}), 500
    except Exception as e:
        print(f"An unexpected error occurred fetching today's candidate count: {e}")
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

    
@app.route('/api/candidates', methods=["GET"])
def get_candidates():
    """Fetches all candidates from the mail_candidate table (for this app)."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM mail_candidate ORDER BY employeeId DESC")
        candidates = cursor.fetchall()

        for candidate in candidates:
            if candidate.get('customFields') and isinstance(candidate['customFields'], str):
                 try:
                     candidate['customFields'] = json.loads(candidate['customFields'])
                 except json.JSONDecodeError:
                      print(f"Error decoding customFields JSON for candidate")
                      candidate['customFields'] = {} # Default to empty dict on error
            elif not candidate.get('customFields'):
                 candidate['customFields'] = {}

            if candidate.get('skills'):
                candidate['skills'] = candidate['skills'].split(',')
            else:
                candidate['skills'] = []

            candidate['id'] = str(candidate.get('employeeId'))

        return jsonify(candidates)
    except mysql.connector.Error as err:
        print(f"Error fetching candidates from mail_candidate: {err}")
        return jsonify({"error": "Failed to fetch candidates from mail_candidate"}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/candidates/<string:candidate_id>', methods=['GET'])
def get_candidate(candidate_id):
    """Fetches a single candidate by ID from the mail_candidate table."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    # Use dictionary=True to get results as dictionaries
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch the candidate, including the customFields JSON column
        cursor.execute("SELECT * FROM mail_candidate WHERE employeeId=%s", (candidate_id,))
        candidate = cursor.fetchone()

        if candidate:
            # **MODIFIED:** Deserialize customFields from JSON string to Python dictionary
            if candidate.get('customFields') and isinstance(candidate['customFields'], str):
                 try:
                     candidate['customFields'] = json.loads(candidate['customFields'])
                 except json.JSONDecodeError:
                      print(f"Error decoding customFields JSON for candidate {candidate_id}")
                      candidate['customFields'] = {} # Default to empty dict on error
            elif not candidate.get('customFields'):
                 candidate['customFields'] = {} # Ensure customFields is always a dict

            # Handle skills (as before)
            if candidate.get('skills'):
                candidate['skills'] = candidate['skills'].split(',')
            else:
                candidate['skills'] = []

            # Ensure the key for the ID is 'employeeId' and is a string for frontend consistency
            candidate['id'] = str(candidate.get('employeeId'))

            return jsonify(candidate)
        else:
            return jsonify({"error": "Candidate not found in mail_candidate"}), 404
    except mysql.connector.Error as err:
        print(f"Error fetching candidate from mail_candidate: {err}")
        return jsonify({"error":"Failed to fetch candidate from mail_candidate"}), 500
    except Exception as e:
         print(f"An unexpected error occurred during candidate fetch: {e}")
         return jsonify({"error": "An unexpected error occurred during candidate fetch", "details": str(e)}), 500
    finally:
        if cursor:
           cursor.close()
        if conn:
           conn.close()


@app.route('/api/candidates', methods=['POST'])
def add_candidate():
    """Adds a new candidate to BOTH 'candidates' and 'mail_candidate' tables."""
    new_candidate_data = request.json
    if not new_candidate_data:
        return jsonify({"error": "Invalid request payload"}), 400
    
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500
    
    cursor = conn.cursor()

    skills_str = ",".join(new_candidate_data.get('skills',[]))
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    custom_fields = json.dumps(new_candidate_data.get('customFields',{}))

    values = (
        new_candidate_data.get('name'),
        new_candidate_data.get('phone'),
        new_candidate_data.get('email'),
        new_candidate_data.get('salary'),
        new_candidate_data.get('expected_ctc'),
        new_candidate_data.get('notice'),
        new_candidate_data.get('totalExperienceYears'),
        new_candidate_data.get('location'),
        new_candidate_data.get('cvUrl'),
        new_candidate_data.get('currentCompanyName'),
        skills_str,
        '',
        new_candidate_data.get('education'),
        new_candidate_data.get('jobTitle'),
        new_candidate_data.get('currentCompanyName'),
        new_candidate_data.get('source'),
        current_time
    )

    values_2 = (
        new_candidate_data.get('name'),
        new_candidate_data.get('phone'),
        new_candidate_data.get('email'),
        new_candidate_data.get('salary'),
        new_candidate_data.get('expected_ctc'),
        new_candidate_data.get('notice'),
        new_candidate_data.get('totalExperienceYears'),
        new_candidate_data.get('location'),
        new_candidate_data.get('cvUrl'),
        new_candidate_data.get('currentCompanyName'),
        skills_str,
        '',
        new_candidate_data.get('education'),
        new_candidate_data.get('jobTitle'),
        new_candidate_data.get('currentCompanyName'),
        new_candidate_data.get('source'),
        current_time,
        custom_fields
    )

    sql_insert_candidates = """
    INSERT INTO candidates (name, phone, email, salary, expected_ctc, notice, totalExperienceYears, location, cvUrl, currentCompanyName, skills, previousCompaniesName, education, jobTitle, companyNames, source, createdAt)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    sql_insert_mail_candidate = """
    INSERT INTO mail_candidate (name, phone, email, salary, expected_ctc, notice, totalExperienceYears, location, cvUrl, currentCompanyName, skills, previousCompaniesName, education, jobTitle, companyNames, source, createdAt, customFields)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    inserted_mail_candidate = None
    try:
        conn.start_transaction()

        cursor.execute(sql_insert_candidates, values)
        # candidates_id = cursor.lastrowid

        cursor.execute(sql_insert_mail_candidate, values_2)
        mail_candidate_id = cursor.lastrowid

        conn.commit()

        cursor.execute("SELECT * FROM mail_candidate WHERE employeeId=%s", (mail_candidate_id,))
        inserted_mail_candidate_row = cursor.fetchone()

        if inserted_mail_candidate_row:
            column_names = [desc[0] for desc in cursor.description]
            inserted_mail_candidate = dict(zip(column_names, inserted_mail_candidate_row)) # Convert row to dictionary

            # **MODIFIED:** Deserialize customFields from JSON string to Python dictionary
            if inserted_mail_candidate.get('customFields') and isinstance(inserted_mail_candidate['customFields'], str):
                 try:
                     inserted_mail_candidate['customFields'] = json.loads(inserted_mail_candidate['customFields'])
                 except json.JSONDecodeError:
                      print(f"Error decoding customFields JSON for candidate {mail_candidate_id}")
                      inserted_mail_candidate['customFields'] = {} # Default to empty dict on error
            elif not inserted_mail_candidate.get('customFields'):
                 inserted_mail_candidate['customFields'] = {} # Ensure customFields is always a dict        

            if inserted_mail_candidate.get('skills'):
                inserted_mail_candidate['skills'] = inserted_mail_candidate['skills'].split(',')
            else:
                inserted_mail_candidate['skills'] = []

            # Ensure the key is 'employeeId' as per your frontend interface
            inserted_mail_candidate['id'] = str(inserted_mail_candidate.get('employeeId'))

        return jsonify(inserted_mail_candidate), 201
    
    except mysql.connector.Error as err:
        print(f"Error adding candidate to tables: {err}")
        conn.rollback() # Rollback the transaction if an error occurs
        return jsonify({"error": "Failed to add candidate to tables", "details": str(err)}), 500
    except Exception as e:
         print(f"An unexpected error occurred during candidate addition: {e}")
         conn.rollback()
         return jsonify({"error": "An unexpected error occurred during candidate addition", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/candidates/<string:candidate_id>', methods=['PUT'])
def update_candidate(candidate_id):
    """Updates an existing candidate in BOTH 'candidates' and 'mail_candidate' tables."""
    updates = request.json
    if not updates:
        return jsonify({"error": "Invalid request payload"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()
    update_fields = []
    update_values = []
    allowed_fields = [
        'name', 'phone', 'email', 'salary', 'expected_ctc', 'notice', 'totalExperienceYears', 'location', 'cvUrl', 'currentCompanyName', 'skills', 'education', 'jobTitle'
    ]

    for field, value in updates.items():
        if field in allowed_fields:
            if field =='skills' and isinstance(value, list):
                update_fields.append(f"{field} = %s")
                update_values.append(",".join(value))
            else:
                update_fields.append(f"{field}=%s")
                update_values.append(value)

    if not update_fields:
        cursor.execute("SELECT * FROM mail_candidate WHERE employeeId = %s", (candidate_id,))
        updated_candidate = cursor.fetchone()
        if not isinstance(updated_candidate, dict) and updated_candidate is not None:
            column_names = [desc[0] for desc in cursor.description]
            updated_candidate = dict(zip(column_names, updated_candidate))

        if updated_candidate:
            if updated_candidate.get('skills'):
                updated_candidate['skills'] = updated_candidate['skills'].split(',')
            else:
                updated_candidate['skills'] = []
            updated_candidate['id'] = str(updated_candidate.get('employeeId'))

        return jsonify(updated_candidate), 200
    
    sql_update = f"UPDATE candidates SET {', '.join(update_fields)} WHERE employeeId = %s"
    sql_update_mail = f"UPDATE mail_candidate SET {', '.join(update_fields)} WHERE employeeId = %s"
    update_values_with_id = update_values + [candidate_id]

    updated_mail_candidate = None
    try:
        # Use a transaction
        conn.start_transaction()

        # Update the existing 'candidates' table
        cursor.execute(sql_update, update_values_with_id)
        rows_updated_existing = cursor.rowcount # Check if update affected any rows

        # Update the new 'mail_candidate' table
        cursor.execute(sql_update_mail, update_values_with_id)
        rows_updated_mail = cursor.rowcount # Check if update affected any rows

        # If both updates were successful (or if the row didn't exist in one), commit
        conn.commit()

        if rows_updated_mail == 0:
            # If the candidate wasn't found in mail_candidate, it wasn't added by this app
            conn.rollback() # Rollback the transaction
            return jsonify({"error": "Candidate not found in mail_candidate"}), 404
    
        cursor.execute("SELECT * FROM mail_candidate WHERE employeeId = %s", (candidate_id,))
        updated_mail_candidate = cursor.fetchone()
    
        if not isinstance(updated_mail_candidate, dict) and updated_mail_candidate is not None:
              column_names = [desc[0] for desc in cursor.description]
              updated_mail_candidate = dict(zip(column_names, updated_mail_candidate))

        if updated_mail_candidate:
             if updated_mail_candidate.get('skills'):
                 updated_mail_candidate['skills'] = updated_mail_candidate['skills'].split(',')
             else:
                 updated_mail_candidate['skills'] = []
             updated_mail_candidate['id'] = str(updated_mail_candidate.get('employeeId'))

        return jsonify(updated_mail_candidate)
    
    except mysql.connector.Error as err:
        print(f"Error updating candidate in tables: {err}")
        conn.rollback()
        return jsonify({"error": "Failed to update candidate in tables", "details": str(err)}), 500
    except Exception as e:
        print(f"An unexpected error occurred during candidate update: {e}")
        conn.rollback()
        return jsonify({"error": "An unexpected error occurred during candidate update", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# Start From Delete API Route


@app.route('/api/candidates/<string:candidate_id>', methods=['DELETE'])
def delete_candidate(candidate_id):
    """Deletes a candidate from 'mail_candidate' table."""
    conn=get_db_connection()
    if conn is None:
        return jsonify({"error":"Database connection failed"}), 500
    cursor = conn.cursor()
    sql_delete_mail_candidate = "DELETE FROM mail_candidate WHERE employeeId = %s"

    try:
        conn.start_transaction()

        cursor.execute(sql_delete_mail_candidate, (candidate_id,))
        rows_deleted_mail = cursor.rowcount

        conn.commit()

        if rows_deleted_mail == 0:
            conn.rollback()
            return jsonify({"error": "Candidate not found in mail_candidate"}), 404
        
        return jsonify({"Message": "Candidate deleted successfully from both tables"}), 200
    
    except mysql.connector.Error as err:
        print(f"Error deleting candidate from tables: {err}")
        conn.rollback()
        return jsonify({"error": "Failed to delete candidate from tables", "details": str(err)}), 500
    except Exception as e:
        print(f"An unexpected error occurred during candidate deletion: {e}")
        conn.rollback()
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/selections/<string:candidate_id>', methods=['GET'])
def get_recipient_selections(candidate_id):
    """Fetches recipient selections for a specific candidate from the recipient_data table."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        sql = "SELECT * FROM recipient_data WHERE mailCandidateId = %s"
        cursor.execute(sql, (candidate_id,))
        selections_list = cursor.fetchall()

        if not selections_list:
            return jsonify({"error": "Selections not found for this candidate"}), 404
        
        selection_data = selections_list[0]

        if selection_data.get('fieldVisibility') and isinstance(selection_data['fieldVisibility'], str):
            selection_data['fieldVisibility'] = json.loads(selection_data['fieldVisibility'])

        formatted_selections = {
            "candidateId": str(selection_data.get('mailCandidateId')),
            "fieldVisibility": selection_data.get('fieldVisibility', {})
        }

        return jsonify(formatted_selections)
    
    except mysql.connector.Error as err:
        print(f"Error fetching recipient selections: {err}")
        return jsonify({"error": "Failed to fetch recipient selections", "details": str(err)}), 500
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
    

@app.route('/api/selections/<string:candidate_id>', methods=['PUT'])
def update_or_create_recipient_selections(candidate_id):
    """Updates or creates recipient selections for a candidate in the recipient_data table."""
    selection_data = request.json
    if not selection_data or 'fieldVisibility' not in selection_data:
        return jsonify({"error": "Invalid request payload"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM recipient_data WHERE mailCandidateId = %s", (candidate_id,))
        existing_selection = cursor.fetchone()

        field_visibility_json = json.dumps(selection_data['fieldVisibility'])

        if existing_selection:
            # Update existing selections
            sql = "UPDATE recipient_data SET fieldVisibility = %s WHERE mailCandidateId = %s"
            values = (field_visibility_json, candidate_id)
            cursor.execute(sql, values)
            conn.commit()
            message = "Selections updated successfully"
        else:
            # Create new selections
            sql = "INSERT INTO recipient_data (mailCandidateId, fieldVisibility) VALUES (%s, %s)"
            values = (candidate_id, field_visibility_json)
            cursor.execute(sql, values)
            conn.commit()
            message = "Selections created successfully"

        cursor.execute("SELECT * FROM recipient_data WHERE mailCandidateId = %s", (candidate_id,))
        saved_selection = cursor.fetchone()

        if not isinstance(saved_selection, dict) and saved_selection is not None:
              column_names = [desc[0] for desc in cursor.description]
              saved_selection = dict(zip(column_names, saved_selection))

        if saved_selection:
            if saved_selection.get('fieldVisibility') and isinstance(saved_selection['fieldVisibility'], str):
                 saved_selection['fieldVisibility'] = json.loads(saved_selection['fieldVisibility'])

            formatted_saved_selection = {
                 "candidateId": str(saved_selection.get('mailCandidateId')),
                 "fieldVisibility": saved_selection.get('fieldVisibility', {})
             }
            return jsonify(formatted_saved_selection), 200 if existing_selection else 201

        return jsonify({"message": message}), 200


    except mysql.connector.Error as err:
        print(f"Error updating/creating recipient selections: {err}")
        conn.rollback()
        return jsonify({"error": "Failed to update/create recipient selections", "details": str(err)}), 500
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        conn.rollback()
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.getenv("BACKEND_PORT", 5001)),  # get port from env or use 5001
        debug=True
    )
