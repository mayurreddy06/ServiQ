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

# Reference to the user_input node
ref_user = db.reference('user_input')
ref_volunteer = db.reference('volunteer_opportunities')

# Fetch data from the user_input node
user_input_data = ref_user.get()
volunteer_data = ref_volunteer.get()

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
    
    def execute(self):
        completion = client.chat.completions.create(
            messages=self.messages,
            model="llama3-70b-8192",
        )
        return completion.choices[0].message.content

# Define the system prompt for the agent to shorten text
prompt1 = """
[to do]
rank scale 1 to 20

""".strip()

# Function to locate similar tasks and output them as a list, with the help of the agent
def searchForTask(userInput):

    common_activities = []
    # Ensure query is always a string
    if not isinstance(userInput, str):
        userInput = str(userInput).strip()

    # If the query is empty, return an error message
    if userInput == "":
        print("Invalid query received, skipping AI request.")
        return "Invalid Input"
    
    for key, value in volunteer_data.items():
        task = f"{value['task']}"
        category = f"{value['category']}"
        agent_input = f"Task: {task} Category: {category}"
        agent = Agent(client=client, system=prompt1)

# 3 distinct methods: python ML, SQL search query


    try:
        agent = Agent(client=client, system=prompt1)
        # Storing the AI shortened description inside result
        result = agent(userInput)
        return result.strip() if result else "No response"
    except Exception as e:
        print(f"AI Error: {e}")
        return "AI Error"


# Function to pull data from Firebase and process it
def process_firebase_data():
    try:
        for key, value in user_input_data.items():
            userInput = f"{value['searchBar']}"
            # set query to the user inputted serach value

            userInput = str(userInput).strip()
            # convert the query into a string

            print(f"Processing Query: {userInput} (Type: {type(userInput)})")
            # prints to the console that this query is being proccessed

            response_short = searchForTask(userInput)

        # for key, value in data.items():
        #     if 'storeName' in value and 'discountAmount' in value:
        #         # 2/11/2025 12:16 PM: Changed query to be more specific. Keep this query
        #         query = f"At {value['storeName']}: {value['discountAmount']}"

        #         # Explicitly convert query to a string
        #         query = str(query).strip()
                
        #         print(f"Processing Query: {query} (Type: {type(query)})")

        #         # Ensure the query is a valid string before sending it to AI
        #         if not isinstance(query, str) or query == "":
        #             print(f"Skipping invalid query: {query}")
        #             continue
                
        #         response_short = getShortText(query)
        #         print(f"AI Response: {response_short}")

        #         # Define separate regex patterns for each field
        #         org_pattern = r"Organization:\s*(.*?)\s*Spots:"
        #         spots_pattern = r"Spots:\s*(.*?)\s*Task"
        #         task_pattern = r"Task:\s*(.*?)\s*Date:"
        #         date_pattern = r"Date:\s*(.*?)\s*Start Time:"
        #         startTime_pattern = r"Start Time:\s*(.*?)\s*End Time:"
        #         endTime_pattern = r"End Time:\s*(.*?)\s*Category:"
        #         category_pattern = r"Category:\s*(.*)"              
            
        #         # Extract each field separately
        #         org_match = re.search(org_pattern, response_short)
        #         spots_match = re.search(spots_pattern, response_short)
        #         task_match = re.search(task_pattern, response_short)
        #         date_match = re.search(date_pattern, response_short)
        #         startTime_match = re.search(startTime_pattern, response_short)
        #         endTime_match = re.search(endTime_pattern, response_short)
        #         category_match = re.search(category_pattern, response_short)
                

        #         # Checking if all of the fields were successfully extracted using the regex, otherwise this means the AI didn't output properly
        #         if org_match and spots_match and task_match and date_match and startTime_match and endTime_match and category_match:
        #             organization = org_match.group(1).strip()
        #             spots = spots_match.group(1).strip()
        #             task = task_match.group(1).strip()
        #             date = date_match.group(1).strip()
        #             startTime = startTime_match.group(1).strip()
        #             endTime = endTime_match.group(1).strip()
        #             category = category_match.group(1).strip()

        #             # Ensure all values are strings (or other JSON-serializable types)
        #             updates = {
        #                 'ai_response': str(response_short),  
        #                 'Organization': str(organization),                
        #                 'Spots': str(spots),          
        #                 'Task': str(task),   
        #                 'Date': str(date),       
        #                 'Start_Time': str(startTime),
        #                 'End_Time': str(endTime),       
        #                 'Category': str(category)         
        #             }
        #         ref.child(key).update(updates)
        #         # updates firebase values
            

    except Exception as e:
        print(f"Error processing Firebase data: {e}")


# Run the function
process_firebase_data()
