import re
import firebase_admin
from firebase_admin import credentials, db
import os
from groq import Groq

# Firebase credentials initialization
cred = credentials.Certificate("firebase_key.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://store-discount-finder-default-rtdb.firebaseio.com/' 
})

# DB Reference
ref = db.reference('/shopping_discounts')

# Initialize the client for GROQ API
os.environ['GROQ_API_KEY'] = "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"
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Define the agent class
class Agent:
    def __init__(self, client, system):
        self.client = client
        # initalizes client as groq
        self.system = system
        # stores the system prompt
        self.messages = []
        # creates an empty list of messages

        if self.system is not None:
            self.messages.append({"role": "system", "content": self.system})

    def __call__(self, message=""):
        if message:
            self.messages.append({"role": "user", "content": message})
        
        result = self.execute()
        self.messages.append({"role": "assistant", "content": result})
        
        return result 
    
    def get_message_history(self):
        return self.message_history
    
    def execute(self):
        completion = client.chat.completions.create(
            messages=self.messages,
            model="llama3-70b-8192",
        )
        return completion.choices[0].message.content

# Define the system prompt for the agent to shorten text
prompt = """
You are given an input, and you need to display an output based on the following examples: [

Example 1:

INPUT
"My mother said that she needs 25 volunteers at the place called the Delaware Common Grounds needs volunteers to serve food on 
the 15th of January from 1 to 3 o'clock in the afternoon"

ASSUMPTION
Most of the ideas were straightforward, 1 to 3 o clock in the afternoon means PM. No year was provided, but I will assume the current year

OUTPUT
Organization: Delaware Common Grounds
Spots: 25
Task: Serving Food
Date: 1/15/2025
Start Time: 1:00 PM
End Time: 3:00 PM
Category: Community Service

Example 2:

INPUT
"The Math Wizard corporation needs between 15 and 27 people for teaching math for 3-5 graders tommorow from 10:00 - 13:00"

ASSUMPTION
The coporation is specificed. The maximum amount of people is 27, so I will say there are 27 spots. The user also inputted "13:00" so I am
assuming they are using miltary time for both of the times he or she provided. The user said 3-5 graders, but for all outputs, to make it
easier, we should use age to classify a certain group of people. 3-5 graders are between 8-11 years old. The user also specificed tommorow.
If the date today is january 19th, then the next day is january 20th.

OUTPUT
Organization: Math Wizard
Spots: 27
Task: Teaching Math to ages 8-11
Date: 1/20/2025
Start Time: 10:00 AM
End Time: 1:00 PM
Category: Education & Mentorship


Here are a list of categories, and the only ones, that can be chosen from:
["Community Service", "Education & Mentorship", "Elderly & Senior Care", "Environmental & Conservation", 
"Health & Wellness", "Animal Welfare", "Youth & Family Support", "Event Volunteering", "Disaster Relief & Emergency Response", "Small Business"]


]

The assumptions are there to guide you. Only return the OUTPUT, do not return the ASSUMPTION
""".strip()

# Function to run the agent with the new approach for one input/output
def getShortText(query):
    # Ensure query is always a string
    if not isinstance(query, str):
        query = str(query).strip()

    # If the query is empty, return an error message
    if query == "":
        print("Invalid query received, skipping AI request.")
        return "Invalid Input"

    try:
        agent = Agent(client=client, system=prompt)
        # Storing the AI shortened description inside result
        result = agent(query)
        return result.strip() if result else "No response"
    except Exception as e:
        print(f"AI Error: {e}")
        return "AI Error"


# Function to pull data from Firebase and process it
def process_firebase_data():
    try:
        data = ref.get()
        if not data:
            print("No data found.")
            return
        
        for key, value in data.items():
            if 'storeName' in value and 'discountAmount' in value:
                # 2/11/2025 12:16 PM: Changed query to be more specific. Keep this query
                query = f"At {value['storeName']}: {value['discountAmount']}"

                # Explicitly convert query to a string
                query = str(query).strip()
                
                print(f"Processing Query: {query} (Type: {type(query)})")

                # Ensure the query is a valid string before sending it to AI
                if not isinstance(query, str) or query == "":
                    print(f"Skipping invalid query: {query}")
                    continue
                
                response_short = getShortText(query)
                print(f"AI Response: {response_short}")

                # Define separate regex patterns for each field
                org_pattern = r"Organization:\s*(.*?)\s*Spots:"
                spots_pattern = r"Spots:\s*(.*?)\s*Task"
                task_pattern = r"Task:\s*(.*?)\s*Date:"
                date_pattern = r"Date:\s*(.*?)\s*Start Time:"
                startTime_pattern = r"Start Time:\s*(.*?)\s*End Time:"
                endTime_pattern = r"End Time:\s*(.*?)\s*Category:"
                category_pattern = r"Category:\s*(.*)"              
            
                # Extract each field separately
                org_match = re.search(org_pattern, response_short)
                spots_match = re.search(spots_pattern, response_short)
                task_match = re.search(task_pattern, response_short)
                date_match = re.search(date_pattern, response_short)
                startTime_match = re.search(startTime_pattern, response_short)
                endTime_match = re.search(endTime_pattern, response_short)
                category_match = re.search(category_pattern, response_short)
                

                # Checking if all of the fields were successfully extracted using the regex, otherwise this means the AI didn't output properly
                if org_match and spots_match and task_match and date_match and startTime_match and endTime_match and category_match:
                    organization = org_match.group(1).strip()
                    spots = spots_match.group(1).strip()
                    task = task_match.group(1).strip()
                    date = date_match.group(1).strip()
                    startTime = startTime_match.group(1).strip()
                    endTime = endTime_match.group(1).strip()
                    category = category_match.group(1).strip()

                    # Ensure all values are strings (or other JSON-serializable types)
                    updates = {
                        'ai_response': str(response_short),  
                        'Organization': str(organization),                
                        'Spots': str(spots),          
                        'Task': str(task),   
                        'Date': str(date),       
                        'Start_Time': str(startTime),
                        'End_Time': str(endTime),       
                        'Category': str(category)         
                    }
                ref.child(key).update(updates)
                # updates firebase values

    except Exception as e:
        print(f"Error processing Firebase data: {e}")


# Run the function
process_firebase_data()
