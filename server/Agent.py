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
    
    def execute(self):
        completion = client.chat.completions.create(
            messages=self.messages,
            model="llama3-70b-8192",
        )
        return completion.choices[0].message.content

# Define the system prompt for the agent to shorten text
prompt = """
You are given an input, and you need to choose whether to call one of two methods to return a certain output:

Option 1, and the only option, call the method "getShortText" based upon these inputs: [

Example 1:
Input: "there is a walmart discount of 50 percent on the first of January"
Output: Walmart Discount of 50%

Example 2:
Input: "Taco bell is selling burritos for 25 Percent off"
Output: Taco Bell Discount of 25% for burritos

Example 3:
Input: "There is a buy one get one 20% off on shirts"
Output: BOGO 20% off shirts
]

Do not write down thoughts, Only the specified output
Now it's your turn:
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

                ref.child(key).update({'ai_response': response_short})

    except Exception as e:
        print(f"Error processing Firebase data: {e}")


# Run the function
process_firebase_data()
