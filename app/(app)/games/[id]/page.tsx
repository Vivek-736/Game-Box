interface GamePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function GamePage({ params }: GamePageProps) {
  const { id } = await params

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <p>{id}</p>
    </div>
  )
}